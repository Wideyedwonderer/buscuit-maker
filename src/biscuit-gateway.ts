import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BiscuitMachineEvents } from './enum/biscuit-events';

@WebSocketGateway({ namespace: '/biscuit', cors: true })
export class BiscuitGateway implements OnGatewayInit, OnGatewayConnection {
  handleConnection(client: any, ...args: any[]) {
    for (const [key, value] of this.latestEvents) {
      this.wss.to(client.id).emit(key, value);
    }
  }
  @WebSocketServer() wss: Server;

  latestEvents = new Map();
  afterInit(server: Server) {
    // server.
    console.log('Websocket Gateway initialized!');
  }
  emitEvent(event: BiscuitMachineEvents, value?: any) {
    this.latestEvents.set(event, value);
    this.wss.emit(event, value);
  }
}
