import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BiscuitMachineService } from './biscuit-machine.service';
import { SwitchStateDto } from './dto/switch-state.dto';
import { MachineStates } from './enum/machine-states.enum';

@Controller()
export class BiscuitController {
  constructor(private readonly biscuitService: BiscuitMachineService) {}

  @Post()
  @HttpCode(200)
  switch(@Body() { newState }: SwitchStateDto): void {
    console.log(newState);
    if (newState === MachineStates.ON) {
      this.biscuitService.turnOn();
    } else if (newState === MachineStates.OFF) {
      this.biscuitService.turnOff();
    } else if (newState === MachineStates.PAUSED) {
      this.biscuitService.pause();
    }
  }
}
