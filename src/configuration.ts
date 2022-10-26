export default async () => {
  return {
    OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS:
      process.env.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS || 1,
    CONVEYOR_LENGTH: process.env.CONVEYOR_LENGTH || 6,
    OVEN_LENGTH: process.env.OVEN_LENGTH || 2,
    OVEN_POSITION: process.env.OVEN_POSITION || 4,
    OVEN_WARMUP_DEGREES_PER_PERIOD:
      process.env.OVEN_WARMUP_DEGREES_PER_PERIOD || 30,
    OVEN_COOL_DOWN_DEGREES_PER_PERIOD:
      process.env.OVEN_COOL_DOWN_DEGREES_PER_PERIOD || 10,
    DESIRED_MININUM_OVEN_TEMPERATURE:
      process.env.DESIRED_MININUM_OVEN_TEMPERATURE || 220,
    DESIRED_MAXIMUM_OVEN_TEMPERATURE:
      process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE || 240,
    MOTOR_PULSE_DURATION_SECONDS: process.env.MOTOR_PULSE_DURATION_SECONDS || 1,
  };
};
