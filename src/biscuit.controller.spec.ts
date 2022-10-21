import { Test, TestingModule } from '@nestjs/testing';
import { BiscuitController } from './biscuit.controller';
import { BiscuitMachineService } from './biscuit-machine.service';

describe('BiscuitController', () => {
  let biscuitController: BiscuitController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [BiscuitController],
      providers: [BiscuitMachineService],
    }).compile();

    biscuitController = app.get<BiscuitController>(BiscuitController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      // expect(biscuitController.switch()).toBe('Hello World!');
    });
  });
});
