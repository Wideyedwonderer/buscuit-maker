import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BiscuitGateway } from './biscuit-gateway';
import { BiscuitMachineEvents, ErrorMessages } from 'biscuit-machine-commons';
import { MachineStates } from './enum/machine-states.enum';
import { MotorStates } from './enum/motor-states.enum';
import { delay } from './utils';

@Injectable()
export class BiscuitMachineService {
  private readonly CONVEYOR_LENGTH;
  private readonly OVEN_LENGTH;
  private readonly OVEN_POSITION;
  private readonly OVEN_WARMUP_DEGREES_PER_PERIOD;
  private readonly OVEN_COOL_DOWN_DEGREES_PER_PERIOD;
  private readonly DESIRED_MININUM_OVEN_TEMPERATURE;
  private readonly DESIRED_MAXIMUM_OVEN_TEMPERATURE;
  private readonly MOTOR_PULSE_DURATION_SECONDS;
  private readonly OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS;

  private machineState: MachineStates = MachineStates.OFF;
  private motorState = MotorStates.OFF;
  private ovenTemperature = 0;

  private firstCookiePosition = -1;
  private lastCookiePosition = -1;
  private firstBurnedCookiePosition = -1;
  private lastBurnedCookiePosition = -1;
  private cookedCookiesAmount = 0;

  private ovenHeating = false;
  private ovenCooling = false;
  private turningOff = false;
  private turningOn = false;
  private pausing = false;
  constructor(
    private readonly configService: ConfigService,
    private biscuitGateway: BiscuitGateway,
  ) {
    this.CONVEYOR_LENGTH = +configService.get('CONVEYOR_LENGTH');
    this.OVEN_LENGTH = +configService.get('OVEN_LENGTH');
    this.OVEN_POSITION = +configService.get('OVEN_POSITION');
    this.OVEN_WARMUP_DEGREES_PER_PERIOD = +configService.get(
      'OVEN_WARMUP_DEGREES_PER_PERIOD',
    );
    this.OVEN_COOL_DOWN_DEGREES_PER_PERIOD = +configService.get(
      'OVEN_COOL_DOWN_DEGREES_PER_PERIOD',
    );
    this.DESIRED_MININUM_OVEN_TEMPERATURE = +configService.get(
      'DESIRED_MININUM_OVEN_TEMPERATURE',
    );
    this.DESIRED_MAXIMUM_OVEN_TEMPERATURE = +configService.get(
      'DESIRED_MAXIMUM_OVEN_TEMPERATURE',
    );
    this.MOTOR_PULSE_DURATION_SECONDS = +configService.get(
      'MOTOR_PULSE_DURATION_SECONDS',
    );
    this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS = +configService.get(
      'OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS',
    );
  }

  async turnOn() {
    if (this.turningOn) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.ALREADY_TURNING_ON,
      );
      return;
    }
    this.turningOn = true;
    if (this.turningOff) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.CANT_TURN_ON_WHILE_TURNING_OFF,
      );
      this.turningOn = false;
      return;
    }
    if (this.machineState === MachineStates.ON) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.MACHINE_IS_ALREADY_TURNED_ON,
      );
      this.turningOn = false;
      return;
    }
    await this.heatOven();

    if (!this.turningOff) {
      if (this.motorState !== MotorStates.ON) {
        this.turnOnMotor();
      }
      this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_PAUSED, false);
      this.machineState = MachineStates.ON;
      this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_ON, true);
    }
    this.turningOn = false;
  }

  private async heatOven() {
    if (this.ovenTemperature >= this.DESIRED_MININUM_OVEN_TEMPERATURE) {
      return;
    }
    this.ovenHeating = true;
    while (
      this.ovenTemperature < this.DESIRED_MININUM_OVEN_TEMPERATURE &&
      !this.ovenCooling
    ) {
      await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS);
      const newOvenTemp = Math.min(
        this.DESIRED_MAXIMUM_OVEN_TEMPERATURE,
        this.ovenTemperature + this.OVEN_WARMUP_DEGREES_PER_PERIOD,
      );
      this.ovenTemperature = newOvenTemp;
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
        this.ovenTemperature,
      );
    }
    this.ovenHeating = false;
    if (!this.ovenCooling) {
      this.biscuitGateway.emitEvent(BiscuitMachineEvents.OVEN_HEATED, true);
    }
    return;
  }
  async turnOff() {
    if (this.turningOff) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.ALREADY_TURNING_OFF,
      );
      return;
    }
    this.turningOff = true;

    if (this.machineState === MachineStates.OFF && !this.ovenHeating) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.MACHINE_IS_ALREADY_OFF,
      );
      this.turningOff = false;
      return;
    }

    if (this.machineState !== MachineStates.OFF) {
      await this.turnOffMotor(true);
    }

    await this.turnOffOven();

    this.turningOff = false;
    this.machineState = MachineStates.OFF;
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_ON, false);
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_PAUSED, false);
  }

  async pause() {
    if (this.pausing) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.ALREADY_PAUSING,
      );
      return;
    }
    this.pausing = true;
    if (this.machineState !== MachineStates.ON) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.CANT_PAUSE_MACHINE_NOT_ON,
      );
      this.pausing = false;
      return;
    }
    if (this.turningOff) {
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.ERROR,
        ErrorMessages.CANT_PAUSE_DURING_TURNING_OFF,
      );
      this.pausing = false;
      return;
    }
    await this.turnOffMotor();
    this.machineState = MachineStates.PAUSED;
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_ON, false);
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MACHINE_PAUSED, true);
    this.pausing = false;
    if (this.cookiesInOven()) {
      this.burningCookiesSafetyProcedure();
    }
  }

  private async turnOffOven() {
    this.ovenCooling = true;

    if (this.ovenHeating) {
      await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS);
    }
    while (this.ovenTemperature > 0) {
      await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS);
      const newTemperature =
        this.ovenTemperature - this.OVEN_COOL_DOWN_DEGREES_PER_PERIOD;
      this.ovenTemperature = newTemperature > 0 ? newTemperature : 0;
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
        this.ovenTemperature,
      );
      this.machineState = MachineStates.OFF;
    }
    this.ovenCooling = false;
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.OVEN_HEATED, false);

    return;
  }

  private async turnOnMotor() {
    this.motorState = MotorStates.ON;
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MOTOR_ON, true);
    while (this.shouldPulse()) {
      await delay(this.MOTOR_PULSE_DURATION_SECONDS);

      if (this.shouldPulse()) {
        await this.pulse();
      }
    }
    return;
  }

  private shouldPulse() {
    return this.motorState === MotorStates.ON && this.turningOff === false;
  }

  private async turnOffMotor(terminate = false) {
    if (terminate) {
      await this.terminateConveyor();
    }
    this.motorState = MotorStates.OFF;
    await delay(this.MOTOR_PULSE_DURATION_SECONDS / 2);
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.MOTOR_ON, false);
  }

  private async pulse() {
    this.extrude();
    // await delay(this.MOTOR_PULSE_DURATION_SECONDS / 2);
    this.moveConveyor();
  }

  private extrude() {
    if (this.lastCookiePosition === -1) {
      this.firstCookiePosition = 0;
      this.lastCookiePosition = 0;
    } else {
      this.lastCookiePosition = 0;
    }
    this.biscuitGateway.emitEvent(BiscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
      firstBurnedCookiePosition: this.firstBurnedCookiePosition,
      lastBurnedCookiePosition: this.lastBurnedCookiePosition,
    });
  }

  private moveConveyor() {
    if (this.firstCookiePosition === -1) {
      return;
    }

    if (
      this.firstCookiePosition === this.CONVEYOR_LENGTH - 1 &&
      this.firstBurnedCookiePosition !== this.firstCookiePosition
    ) {
      this.cookedCookiesAmount += 1;
      this.biscuitGateway.emitEvent(
        BiscuitMachineEvents.COOKIE_COOKED,
        this.cookedCookiesAmount,
      );
    } else {
      if (
        this.firstCookiePosition !== -1 &&
        this.firstCookiePosition < this.CONVEYOR_LENGTH - 1
      ) {
        this.firstCookiePosition += 1;
      }
    }
    if (this.lastCookiePosition === this.CONVEYOR_LENGTH - 1) {
      this.lastCookiePosition = -1;
      this.firstCookiePosition = -1;
    } else {
      this.lastCookiePosition += 1;
    }

    if (this.lastBurnedCookiePosition === this.CONVEYOR_LENGTH - 1) {
      this.lastBurnedCookiePosition = -1;
      this.firstBurnedCookiePosition = -1;
    } else {
      if (this.lastBurnedCookiePosition !== -1) {
        this.lastBurnedCookiePosition += 1;
      }
      if (
        this.firstBurnedCookiePosition !== -1 &&
        this.firstBurnedCookiePosition < this.CONVEYOR_LENGTH - 1
      ) {
        this.firstBurnedCookiePosition += 1;
      }
    }

    this.biscuitGateway.emitEvent(BiscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
      firstBurnedCookiePosition: this.firstBurnedCookiePosition,
      lastBurnedCookiePosition: this.lastBurnedCookiePosition,
    });
  }

  private async terminateConveyor() {
    while (
      this.lastCookiePosition < this.CONVEYOR_LENGTH &&
      this.lastCookiePosition !== -1
    ) {
      this.moveConveyor();
      await delay(this.MOTOR_PULSE_DURATION_SECONDS / 2);
    }
  }

  private async burningCookiesSafetyProcedure() {
    await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS * 2);
    this.biscuitGateway.emitEvent(
      BiscuitMachineEvents.WARNING,
      ErrorMessages.COOKIES_WILL_BURN,
    );
    if (!this.shouldContinueBurnedCookiesProcedure()) {
      return;
    }
    await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS * 2);
    this.biscuitGateway.emitEvent(
      BiscuitMachineEvents.WARNING,
      ErrorMessages.COOKIES_WILL_BECOME_BRICKS_SOON,
    );
    if (!this.shouldContinueBurnedCookiesProcedure()) {
      return;
    }
    await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS * 2);
    this.biscuitGateway.emitEvent(
      BiscuitMachineEvents.WARNING,
      ErrorMessages.COOKIES_WILL_BURN_LAST_WARNING,
    );
    if (!this.shouldContinueBurnedCookiesProcedure()) {
      return;
    }
    await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS * 2);
    if (!this.shouldContinueBurnedCookiesProcedure()) {
      return;
    }
    this.biscuitGateway.emitEvent(
      BiscuitMachineEvents.ERROR,
      ErrorMessages.EMERGANCY_TURN_OFF_INITIATED,
    );

    this.firstBurnedCookiePosition = Math.min(
      this.ovenEndIndex(),
      this.firstCookiePosition,
    );

    this.lastBurnedCookiePosition = Math.max(
      this.ovenStartIndex(),
      this.lastCookiePosition,
    );

    this.biscuitGateway.emitEvent(BiscuitMachineEvents.COOKIES_MOVED, {
      lastCookiePosition: this.lastCookiePosition,
      firstCookiePosition: this.firstCookiePosition,
      firstBurnedCookiePosition: this.firstBurnedCookiePosition,
      lastBurnedCookiePosition: this.lastBurnedCookiePosition,
    });
    await delay(this.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS * 2);

    if (this.shouldContinueBurnedCookiesProcedure()) {
      this.turnOff();
    }
  }
  private shouldContinueBurnedCookiesProcedure = () =>
    this.machineState === MachineStates.PAUSED && !this.turningOff;

  private cookiesInOven() {
    console.log('check if cookies');
    console.log(this.lastCookiePosition);
    console.log(this.firstCookiePosition);

    return (
      this.firstCookiePosition >= this.ovenStartIndex() &&
      this.lastCookiePosition <= this.ovenEndIndex()
    );
  }

  private ovenStartIndex() {
    return this.OVEN_POSITION - 1;
  }

  private ovenEndIndex() {
    return this.OVEN_POSITION - 1 + this.OVEN_LENGTH - 1;
  }
}
