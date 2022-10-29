### Biscuit Machine Websockets Server


## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

```

## Test

```bash

# e2e tests
$ npm run test:e2e

```

## Set up environment

By providing .env file you can override the following variables:

| Variable | Purpose | Default|
|--|--|--|
|  PORT | The port server listens to |3001|
|  OVEN_SPEED_PERIOD_LENGTH_IN_SECONDS | Oven warm-up/cool-down speed in seconds |1|
| CONVEYOR_LENGTH | Length of conveyor as of how many cookies it can take at  the same time |6|
| OVEN_LENGTH | Oven length as of maximum cookies inside |2|
| OVEN_POSITION | Oven position on conveyor |4|
| OVEN_WARMUP_DEGREES_PER_PERIOD | Degrees the oven warms up with for the SPEED_PERIOD |30|
| OVEN_COOL_DOWN_DEGREES_PER_PERIOD | Degrees the oven warms up with for the SPEED_PERIOD |25|
| DESIRED_MININUM_OVEN_TEMPERATURE | The minimum operating temperature |220|
| DESIRED_MAXIMUM_OVEN_TEMPERATURE | The maximum operating temperature |240|
| MOTOR_PULSE_DURATION_SECONDS | How many seconds it take for conveyor to move one position |2|

## Connect

Please use the following React FE to connect to the biscuit machine: https://github.com/Wideyedwonderer/biscuit-fe

If you would like to create your own, you may still wish to use the above as reference.
