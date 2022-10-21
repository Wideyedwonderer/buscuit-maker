import {
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { BuscuitMachineEvents } from './enum/biscuit-events';

@WebSocketGateway({ namespace: '/biscuit', cors: true })
export class BiscuitGateway implements OnGatewayInit {
  @WebSocketServer() wss: Server;

  afterInit(server: Server) {
    // server.
    console.log('Websocket Gateway initialized!');
  }
  emitEvent(event: BuscuitMachineEvents, value?: any) {
    this.wss.emit(event, value);
  }
}
