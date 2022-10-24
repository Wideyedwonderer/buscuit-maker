import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { time } from 'console';
import { BiscuitGateway } from './biscuit-gateway';
import { BuscuitMachineEvents } from './enum/biscuit-events';
import { MachineStates } from './enum/machine-states.enum';
import { MotorStates } from './enum/motor-states.enum';
import { delay } from './utils';

@Injectable()
export class BiscuitMachineService {
  private readonly CONVEYOR_LENGTH;
  private readonly OVEN_LENGTH;
  private readonly OVEN_POSITION;
  private readonly OVEN_WARMUP_DEGREES_PER_SECOND;
  private readonly OVEN_COOL_DOWN_DEGREES_PER_SECOND;
  private readonly DESIRED_OVEN_TEMPERATURE;
  private readonly MOTOR_PULSE_DURATION_SECONDS;

  private machineState: MachineStates = MachineStates.OFF;
  private motorState = MotorStates.OFF;
  private ovenTemperature = 0;

  private firstCookiePosition = -1;
  private lastCookiePosition = -1;
  private cookedCookiesAmount = 0;

  constructor(
    private readonly configService: ConfigService,
    private biscuitGateway: BiscuitGateway,
  ) {
    // TODO: validate
    this.CONVEYOR_LENGTH = configService.get('CONVEYOR_LENGTH');
    this.OVEN_LENGTH = configService.get('OVEN_LENGTH');
    this.OVEN_POSITION = configService.get('OVEN_POSITION');
    this.OVEN_WARMUP_DEGREES_PER_SECOND = configService.get(
      'OVEN_WARMUP_DEGREES_PER_SECOND',
    );
    this.OVEN_COOL_DOWN_DEGREES_PER_SECOND = configService.get(
      'OVEN_COOL_DOWN_DEGREES_PER_SECOND',
    );
    this.DESIRED_OVEN_TEMPERATURE = configService.get(
      'DESIRED_OVEN_TEMPERATURE',
    );
    this.MOTOR_PULSE_DURATION_SECONDS = configService.get(
      'MOTOR_PULSE_DURATION_SECONDS',
    );
  }

  async turnOn() {
    if (this.machineState === MachineStates.ON) {
      throw new Error('Machine is already turned on.');
    }
    await this.heatOven(this.DESIRED_OVEN_TEMPERATURE);

    if (this.motorState !== MotorStates.ON) {
      this.turnOnMotor();
    }
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_PAUSED, false);
    this.machineState = MachineStates.ON;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_ON, true);
  }

  private async heatOven(desiredTemperature: number) {
    if (this.ovenTemperature >= desiredTemperature) {
      return;
    }

    while (this.ovenTemperature < desiredTemperature) {
      await delay(1);
      this.ovenTemperature += this.OVEN_WARMUP_DEGREES_PER_SECOND;
      this.biscuitGateway.emitEvent(
        BuscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
        this.ovenTemperature,
      );
    }
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.OVEN_HEATED, true);
    return;
  }
  async turnOff() {
    if (this.machineState === MachineStates.OFF) {
      throw new Error('Machine is already turned off.');
    }
    await this.turnOffMotor();
    await this.terminateConveyor();
    await this.turnOffOven();
    this.machineState = MachineStates.OFF;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_ON, false);
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_PAUSED, false);
  }

  async pause() {
    if (this.machineState !== MachineStates.ON) {
      throw new Error('Machine should be ON, in order to pause.');
    }
    await this.turnOffMotor();
    this.machineState = MachineStates.PAUSED;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_ON, false);
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MACHINE_PAUSED, true);
  }

  private async turnOffOven() {
    while (this.ovenTemperature >= 0) {
      await delay(1);
      this.ovenTemperature -= this.OVEN_COOL_DOWN_DEGREES_PER_SECOND;
      this.biscuitGateway.emitEvent(
        BuscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
        this.ovenTemperature,
      );
      this.machineState = MachineStates.OFF;
    }
    return;
  }

  private async turnOnMotor() {
    this.motorState = MotorStates.ON;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MOTOR_ON, true);
    while (this.motorState === MotorStates.ON) {
      await delay(this.MOTOR_PULSE_DURATION_SECONDS);
      await this.pulse();
    }

    return;
  }

  private async turnOffMotor() {
    this.motorState = MotorStates.OFF;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.MOTOR_ON, false);
  }

  private pulse() {
    this.extrude();
    this.moveConveyor();
  }

  private extrude() {
    if (this.lastCookiePosition === 0) {
      throw new Error(
        'Extruding error, there is already dough below the extruder',
      );
    }
    if (this.lastCookiePosition === -1) {
      this.firstCookiePosition = 0;
      this.lastCookiePosition = 0;
    } else {
      this.lastCookiePosition = 0;
    }
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
    });
  }

  private moveConveyor() {
    if (this.firstCookiePosition === -1) {
      return;
    }

    if (this.firstCookiePosition === this.CONVEYOR_LENGTH - 1) {
      this.cookedCookiesAmount += 1;
      this.biscuitGateway.emitEvent(
        BuscuitMachineEvents.COOKIE_COOKED,
        this.cookedCookiesAmount,
      );
    } else {
      this.firstCookiePosition += 1;
    }

    this.lastCookiePosition += 1;
    this.biscuitGateway.emitEvent(BuscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
    });
  }

  private async terminateConveyor() {
    while (this.lastCookiePosition < this.CONVEYOR_LENGTH) {
      this.moveConveyor();
      await delay(1);
    }
    this.lastCookiePosition = -1;
    this.firstCookiePosition = -1;

    this.biscuitGateway.emitEvent(BuscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
    });
  }
}
