import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { EntityManager } from '@mikro-orm/postgresql';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn().mockImplementation((indicators) => {
              // Execute the indicators passed to health check to ensure they don't crash
              for (const indicator of indicators) {
                indicator();
              }
              return Promise.resolve({
                status: 'ok',
                info: {
                  database: { status: 'up' },
                  memory_heap: { status: 'up' },
                  disk: { status: 'up' },
                },
              });
            }),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            getConnection: jest.fn().mockReturnValue({
              execute: jest.fn().mockResolvedValue([{ '1': 1 }]),
            }),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn() },
        },
        {
          provide: DiskHealthIndicator,
          useValue: { checkStorage: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get<HealthCheckService>(HealthCheckService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check status', async () => {
    const result = await controller.check();

    expect(result).toEqual({
      status: 'ok',
      info: {
        database: { status: 'up' },
        memory_heap: { status: 'up' },
        disk: { status: 'up' },
      },
    });
    expect(healthCheckService.check).toHaveBeenCalled();
  });
});
