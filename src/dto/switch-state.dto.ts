import { IsEnum } from 'class-validator';
import { MachineStates } from 'src/enum/machine-states.enum';

export class SwitchStateDto {
  @IsEnum(MachineStates)
  newState: MachineStates;
}
