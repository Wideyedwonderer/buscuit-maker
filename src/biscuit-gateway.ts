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

@WebSocketGateway({ namespace: '/biscuit', cors: true })
export class BiscuitGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    @Inject(forwardRef(() => BiscuitMachineService))
    private readonly biscuitService: BiscuitMachineService,
  ) {}
  handleConnection(client: any, ...args: any[]) {
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
    });
  }
  emitEvent<T extends BiscuitMachineEvents>(
    event: T,
    value?: BuscuitMachineEventPayloadTypes[T],
  ) {
    if (event !== BiscuitMachineEvents.ERROR) {
      this.latestEvents.set(event, value);
    }
    this.wss.emit(event, value);
  }
}
