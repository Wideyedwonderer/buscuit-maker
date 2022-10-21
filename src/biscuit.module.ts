import { Module } from '@nestjs/common';
import { BiscuitController } from './biscuit.controller';
import { BiscuitMachineService } from './biscuit-machine.service';
import configuration from './configuration';
import { ConfigModule } from '@nestjs/config';
import { BiscuitGateway } from './biscuit-gateway';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] })],
  controllers: [BiscuitController],
  providers: [BiscuitMachineService, BiscuitGateway],
})
export class BiscuitModule {}
