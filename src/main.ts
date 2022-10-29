import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BiscuitModule } from './biscuit.module';

async function bootstrap() {
  const app = await NestFactory.create(BiscuitModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT || 3001);
}
bootstrap();
