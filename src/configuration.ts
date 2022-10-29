import * as Joi from 'joi';

export default async () => {
  const schema = Joi.object({
    OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS: Joi.number().min(0).required(),
    CONVEYOR_LENGTH: Joi.number().min(5).required(),
    OVEN_LENGTH: Joi.number().min(2).required(),
    OVEN_POSITION: Joi.number().min(3).required(),
    OVEN_WARMUP_DEGREES_PER_PERIOD: Joi.number().min(1).required(),
    OVEN_COOL_DOWN_DEGREES_PER_PERIOD: Joi.number().min(1).required(),
    DESIRED_MININUM_OVEN_TEMPERATURE: Joi.number().min(120).required(),
    DESIRED_MAXIMUM_OVEN_TEMPERATURE: Joi.number().max(260).required(),
    MOTOR_PULSE_DURATION_SECONDS: Joi.number().min(0.1).required(),
    PORT: Joi.number().min(0.1).required(),
  });

  const config = {
    OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS:
      +process.env.OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS || 1,
    CONVEYOR_LENGTH: +process.env.CONVEYOR_LENGTH || 6,
    // As of how many cookie positions it has
    OVEN_LENGTH: +process.env.OVEN_LENGTH || 2,
    // At which cookie position on conveyor is the oven situated
    OVEN_POSITION: +process.env.OVEN_POSITION || 4,
    OVEN_WARMUP_DEGREES_PER_PERIOD:
      +process.env.OVEN_WARMUP_DEGREES_PER_PERIOD || 30,
    OVEN_COOL_DOWN_DEGREES_PER_PERIOD:
      +process.env.OVEN_COOL_DOWN_DEGREES_PER_PERIOD || 25,
    DESIRED_MININUM_OVEN_TEMPERATURE:
      +process.env.DESIRED_MININUM_OVEN_TEMPERATURE || 220,
    DESIRED_MAXIMUM_OVEN_TEMPERATURE:
      +process.env.DESIRED_MAXIMUM_OVEN_TEMPERATURE || 240,
    MOTOR_PULSE_DURATION_SECONDS:
      +process.env.MOTOR_PULSE_DURATION_SECONDS || 2,
    PORT: +process.env.MOTOR_PULSE_DURATION_SECONDS || 3001,
  };
  const error = schema.validate(config).error;

  if (error) {
    throw new Error('Config validation error! ' + error.message);
  }
  return config;
};
