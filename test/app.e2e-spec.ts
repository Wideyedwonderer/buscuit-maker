import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { BiscuitModule } from '../src/biscuit.module';
import * as io from 'socket.io-client';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { delay } from '../src/utils';
import { BiscuitMachineEvents } from '../src/enum/biscuit-events';
import { ErrorMessages } from '../src/errors/error-messages';

jest.setTimeout(7000);
const OVEN_NEW_SPEED_PERIOD = 0.1;
const MOTOR_NEW_PULSE_DURATION = 0.1;
describe('Biscuit Machine (e2e)', () => {
  let app: INestApplication;
  let socket: io.Socket;

  beforeEach(async () => {
    process.env.OVEN_WARMUP_DEGREES_PER_PERIOD = '150';
    process.env.OVEN_COOL_DOWN_DEGREES_PER_PERIOD = '150';

    process.env.DESIRED_MININUM_OVEN_TEMPERATURE = '220';
    process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE = '240';
    process.env.PORT = '3010';
    process.env.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS =
      OVEN_NEW_SPEED_PERIOD + '';
    process.env.MOTOR_PULSE_DURATION_SECONDS = MOTOR_NEW_PULSE_DURATION + '';
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

  it('Oven should warm up, before motor is on', async () => {
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

  it(`Oven should warm up to at least ${process.env.DESIRED_MININUM_OVEN_TEMPERATURE} degrees`, async () => {
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

  it(`Oven should warm up to a maximum of ${process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE} degrees`, async () => {
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

  it(`Motor should be turned on when Oven warmed up.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 0.5);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(OVEN_NEW_SPEED_PERIOD * 1);
    const maxOvenTemperature = events
      .filter((x) => x.event === BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE)
      .map((x) => x.args)
      .sort((a, b) => b - a)[0];

    expect(maxOvenTemperature).toEqual(150);
  });

  it(`Oven should stop heating if machine turned off during heating`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);

    const ovenHeatedIndex = events.findIndex(
      (x) => x.event === BiscuitMachineEvents.OVEN_HEATED,
    );
    const motorOnIndex = events.findIndex(
      (x) => x.event === BiscuitMachineEvents.MOTOR_ON,
    );

    expect(ovenHeatedIndex).toBeGreaterThan(0);
    expect(motorOnIndex).toBeGreaterThan(0);
    expect(ovenHeatedIndex).toBeLessThan(motorOnIndex);
  });

  it(`After turning motor on, conveyor should start moving `, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 2);

    const cookieMovedEvent = events.find(
      (x) => x?.args?.lastCookiePosition === 0,
    );
    expect(cookieMovedEvent).not.toBe(undefined);
  });

  it(`Cookies should appear on conveyor in correct order`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 7);

    const cookieMovedEvents = events.filter(
      (x) => x.event === BiscuitMachineEvents.COOKIES_MOVED,
    );
    const lastCookiePositions = cookieMovedEvents.map(
      (x) => x.args.lastCookiePosition,
    );
    const firstCookiePositions = cookieMovedEvents.map(
      (x) => x.args.firstCookiePosition,
    );
    expect(lastCookiePositions[0]).toEqual(0);
    expect(lastCookiePositions[1]).toEqual(1);
    expect(lastCookiePositions[2]).toEqual(0);
    expect(lastCookiePositions[3]).toEqual(1);
    expect(firstCookiePositions[0]).toEqual(0);
    expect(firstCookiePositions[1]).toEqual(1);
    expect(firstCookiePositions[3]).toEqual(2);
    expect(firstCookiePositions[5]).toEqual(3);
    expect(firstCookiePositions[7]).toEqual(4);
    expect(firstCookiePositions[9]).toEqual(5);
  });

  it(`If paused, conveyor should stop moving after current pulse finishes.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 2);
    socket.emit(BiscuitMachineEvents.PAUSE_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);

    const cookieMovedEvents = events.filter(
      (x) => x.event === BiscuitMachineEvents.COOKIES_MOVED,
    );

    expect(cookieMovedEvents.length).toEqual(4);
    const lastCookieMovedIndex = events.findIndex(
      (x) => x.args?.firstCookiePosition === 2,
    );
    const pausedIndex = events.findIndex(
      (x) => x.event === BiscuitMachineEvents.MACHINE_PAUSED && x.args === true,
    );
    expect(pausedIndex).toBeGreaterThan(0);
    expect(lastCookieMovedIndex).toBeLessThan(pausedIndex);
  });

  it(`Oven should cook cookies successfully.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 7);

    const cookieCookedEvents = events.filter(
      (x) => x.event === BiscuitMachineEvents.COOKIE_COOKED,
    );

    expect(cookieCookedEvents[1].args).toEqual(2);
  });

  it(`If machine turned off, conveyor should empty out.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 3);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 8);
    const lastCookieMovedEvent = events
      .filter((x) => x.event === BiscuitMachineEvents.COOKIES_MOVED)
      .reverse()[0];

    expect(lastCookieMovedEvent.args.lastCookiePosition).toEqual(-1);
    expect(lastCookieMovedEvent.args.firstCookiePosition).toEqual(-1);
  });

  it(`If machine turned off, oven should heat down after conveyor is empty.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 3);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 8);
    const lastCookieMovedEventIndex = events.findIndex(
      (x) => x?.args.firstCookiePosition === -1,
    );
    const ovenHeatDownEventIndex = events.findIndex(
      (x) =>
        x.event === BiscuitMachineEvents.OVEN_TEMPERATURE_CHANGE &&
        x.args === 90,
    );
    expect(lastCookieMovedEventIndex).toBeGreaterThan(0);
    expect(ovenHeatDownEventIndex).toBeGreaterThan(0);
    expect(ovenHeatDownEventIndex).toBeGreaterThan(lastCookieMovedEventIndex);
  });

  it(`Should emit error if paused during turning off phase.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 3);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    socket.emit(BiscuitMachineEvents.PAUSE_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    const error = events.find((x) => x.event === BiscuitMachineEvents.ERROR);
    expect(error.args).toEqual(ErrorMessages.CANT_PAUSE_DURING_TURNING_OFF);
  });

  it(`Should emit error if paused during turning on phase.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 1);
    socket.emit(BiscuitMachineEvents.PAUSE_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    const error = events.find((x) => x.event === BiscuitMachineEvents.ERROR);
    expect(error.args).toEqual(ErrorMessages.CANT_PAUSE_MACHINE_NOT_ON);
  });

  it(`Should emit error if turn on during turning off phase.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 3);
    socket.emit(BiscuitMachineEvents.TURN_OFF_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);
    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    const error = events.find((x) => x.event === BiscuitMachineEvents.ERROR);
    expect(error.args).toEqual(ErrorMessages.CANT_TURN_ON_WHILE_TURNING_OFF);
  });

  it(`Should emit error if turn on during turning off phase.`, async () => {
    const events = [];

    socket.onAny((event, args) => {
      events.push({ event, args });
    });

    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(OVEN_NEW_SPEED_PERIOD * 3);
    await delay(MOTOR_NEW_PULSE_DURATION * 3);
    socket.emit(BiscuitMachineEvents.TURN_ON_MACHINE);

    await delay(MOTOR_NEW_PULSE_DURATION * 1);
    const error = events.find((x) => x.event === BiscuitMachineEvents.ERROR);
    expect(error.args).toEqual(ErrorMessages.MACHINE_IS_ALREADY_TURNED_ON);
  });
});
