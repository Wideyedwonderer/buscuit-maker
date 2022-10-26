import { Test, TestingModule } from '@nestjs/testing';
import { BiscuitMachineService } from './biscuit-machine.service';

describe('BiscuitMachineService', () => {
  let biscuitService: BiscuitMachineService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [BiscuitMachineService],
    }).compile();

    biscuitService = app.get<BiscuitMachineService>(BiscuitMachineService);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(biscuitController.switch()).toBe('Hello World!');
    });
  });
});
