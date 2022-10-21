export enum BuscuitMachineEvents {
  // General
  MACHINE_ON = 'MACHINE_ON',
  MOTOR_ON = 'MOTOR_ON',
  MOTOR_OFF = 'MOTOR_OFF',

  // Oven
  OVEN_TEMPERATURE_CHANGE = 'OVEN_TEMPERATURE_CNAHGE',
  OVEN_HEATED = 'OVEN_HEATED',

  // Conveyor
  COOKIE_COOKED = 'COOKIE_COOKED',
  COOKIES_MOVED = 'COOKIES_MOVED',
}
// type MACHINE_ON = string;
// // Add types for value send connected to the enum
// export const BuscuitMachineEventValueTypes = {
//     MACHINE_ON: MACHINE_ON,
// }
// const map = new Map();
// map.set('MACHINE_ON', MACHINE_ON);
