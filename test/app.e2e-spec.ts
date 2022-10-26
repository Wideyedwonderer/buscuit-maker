import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BiscuitModule } from '../src/biscuit.module';
import * as io from 'socket.io-client';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { delay } from '../src/utils';
import { BiscuitMachineEvents } from '../src/enum/biscuit-events';
import { ErrorMessages } from '../src/errors/error-messages';
import { NonTransferableLayout } from '@solana/spl-token';

jest.setTimeout(7000);
const OVEN_NEW_SPEED_PERIOD = 0.1;
describe('BiscuitController (e2e)', () => {
  let app: INestApplication;
  let socket: io.Socket;

  beforeEach(async () => {
    process.env.OVEN_WARMUP_DEGREES_PER_PERIOD = '150';
    process.env.DESIRED_MININUM_OVEN_TEMPERATURE = '220';
    process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE = '240';
    process.env.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS = OVEN_NEW_SPEED_PERIOD + '';
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [BiscuitModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new IoAdapter(app));
    await app.listen(process.env.PORT);
    socket = io.connect(`ws://localhost:${process.env.PORT}/biscuit`);
  });

  afterEach(async () => {
    app.close();
    socket.close();
  });

  it('oven should warm up, before motor is on', async () => {
    const events = [];
    socket.onAny((eventName) => {
      events.push(eventName);
    });
    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);
    await delay(OVEN_NEW_SPEED_PERIOD * 3);

    expect(events.indexOf(BiscuitMachineEvents.OVEN_HEATED)).toBeLessThan(
      events.indexOf(BiscuitMachineEvents.MOTOR_ON),
    );
  });

  it(`oven should warm up to at least ${process.env.DESIRED_MININUM_OVEN_TEMPERATURE} degrees`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });
    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    const ovenTemperature = events
      .reverse()
      .find(
        (x) => x.event === BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
      ).args;

    expect(ovenTemperature).toBeGreaterThanOrEqual(
      +process.env.DESIRED_MININUM_OVEN_TEMPERATURE,
    );
  });

  it(`oven should warm up to a maximum of ${process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE} degrees`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });
    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    const ovenTemperature = events
      .reverse()
      .find(
        (x) => x.event === BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE,
      ).args;

    expect(ovenTemperature).toBeLessThanOrEqual(
      +process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE,
    );
  });
  ErrorMessages.CANT_PAUSE_MACHINE_NOT_ON;

  it(`Oven should stop heating if machine turned off during heating`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(OVEN_NEW_SPEED_PERIOD * 4);
    const maxOvenTemperature = events
      .filter((x) => x.event === BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE)
      .map((x) => x.args)
      .sort((a, b) => b - a)[0];

    expect(maxOvenTemperature).toEqual(150);
  });
});
