export enum BiscuitMachineEvents {
  // CLIENT COMMANDS
  TURN_ON_MACHINE = 'TURN_ON_MACHINE',
  TURN_OFF_MACHINE = 'TURN_OFF_MACHINE',
  PAUSE_MACHINE = 'PAUSE_MACHINE',
  // General
  MACHINE_ON = 'MACHINE_ON',

  MACHINE_PAUSED = 'MACHINE_PAUSED',

  MOTOR_ON = 'MOTOR_ON',

  // Oven
  OVEN_TEMPERATURE_CHANGE = 'OVEN_TEMPERATURE_CHANGE',
  OVEN_HEATED = 'OVEN_HEATED',

  // Conveyor
  COOKIE_COOKED = 'COOKIE_COOKED',
  COOKIES_MOVED = 'COOKIES_MOVED',

  ERROR = 'ERROR',
}
// type MACHINE_ON = string;
// // Add types for value send connected to the enum
// export const BuscuitMachineEventValueTypes = {
//     MACHINE_ON: MACHINE_ON,
// }
// const map = new Map();
// map.set('MACHINE_ON', MACHINE_ON);
