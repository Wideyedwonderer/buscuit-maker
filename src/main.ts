import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BiscuitModule } from './biscuit.module';

async function bootstrap() {
  const app = await NestFactory.create(BiscuitModule);
  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  await app.listen(3001);
}
bootstrap();
