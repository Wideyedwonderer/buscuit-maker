import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BiscuitModule } from '../src/biscuit.module';
import * as io from 'socket.io-client';
import { IoAdapter } from '@nestjs/platform-socket.io';

describe('BiscuitController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BiscuitModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));

    await app.listen(3001);
  });

  it('should connect successfully', (done) => {
    const socket = io.connect('ws://localhost:3001/biscuit');

    socket.emit('hello');
    socket.on('connect', () => {
      console.log('I am connected! YEAAAP');
      done();
    });
    // socket.binaryType

    socket.on('close', (code, reason) => {
      done({ code, reason });
    });

    // socket.on('error', (error) => {
    //   done(error);
    // });
  });
});
