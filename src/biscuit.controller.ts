import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { BiscuitMachineService } from './biscuit-machine.service';
import { SwitchStateDto } from './dto/switch-state.dto';
import { MachineStates } from './enum/machine-states.enum';

@Controller()
export class BiscuitController {
  constructor(private readonly biscuitService: BiscuitMachineService) {}

  @Post()
  @HttpCode(200)
  switch(@Body() { newState }: SwitchStateDto): void {
    if (newState === MachineStates.ON) {
      this.biscuitService.turnOn();
    } else if (newState === MachineStates.OFF) {
      this.biscuitService.turnOff();
    } else if (newState === MachineStates.PAUSED) {
      this.biscuitService.pause();
    }
  }
}
