import { forwardRef, Inject } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BiscuitMachineService } from './biscuit-machine.service';
import {
  BiscuitMachineEvents,
  BuscuitMachineEventPayloadTypes,
} from 'biscuit-machine-commons';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({ namespace: '/biscuit', cors: true })
export class BiscuitGateway implements OnGatewayInit, OnGatewayConnection {
  private CONVEYOR_LENGTH;
  private OVEN_LENGTH;
  private OVEN_POSITION;
  private MOTOR_PULSE_DURATION_SECONDS;
  constructor(
    @Inject(forwardRef(() => BiscuitMachineService))
    private readonly biscuitService: BiscuitMachineService,
    private readonly configService: ConfigService,
  ) {
    this.CONVEYOR_LENGTH = +configService.get('CONVEYOR_LENGTH');
    this.OVEN_LENGTH = +configService.get('OVEN_LENGTH');
    this.OVEN_POSITION = +configService.get('OVEN_POSITION');
    this.MOTOR_PULSE_DURATION_SECONDS = +configService.get(
      'MOTOR_PULSE_DURATION_SECONDS',
    );
  }
  handleConnection(client: any) {
    for (const [key, value] of this.latestEvents) {
      this.wss.to(client.id).emit(key, value);
    }
  }
  @WebSocketServer() wss: Server;

  latestEvents = new Map();
  afterInit(server: Server) {
    server.on('connection', (socket) => {
      socket.on(BiscuitMachineEvents.TURN_ON_MACHINE, async () => {
        return this.biscuitService.turnOn();
      });
      socket.on(BiscuitMachineEvents.TURN_OFF_MACHINE, async () => {
        return this.biscuitService.turnOff();
      });
      socket.on(BiscuitMachineEvents.PAUSE_MACHINE, async () => {
        return this.biscuitService.pause();
      });
      socket.emit(BiscuitMachineEvents.INITIAL_CONFIG, {
        ovenLength: this.OVEN_LENGTH,
        conveyorLength: this.CONVEYOR_LENGTH,
        ovenPosition: this.OVEN_POSITION,
        motorPulseDurationSeconds: this.MOTOR_PULSE_DURATION_SECONDS,
      });
    });
  }
  emitEvent<T extends BiscuitMachineEvents>(
    event: T,
    value?: BuscuitMachineEventPayloadTypes[T],
  ) {
    if (
      event !== BiscuitMachineEvents.ERROR &&
      event !== BiscuitMachineEvents.WARNING
    ) {
      this.latestEvents.set(event, value);
    }
    this.wss.emit(event, value);
  }
}
