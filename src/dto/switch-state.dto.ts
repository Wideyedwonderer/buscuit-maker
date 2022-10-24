import { IsEnum } from 'class-validator';
import { MachineStates } from '../enum/machine-states.enum';

export class SwitchStateDto {
  @IsEnum(MachineStates)
  newState: MachineStates;
}
