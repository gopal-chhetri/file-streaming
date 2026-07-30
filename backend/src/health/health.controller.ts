import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { EntityManager } from '@mikro-orm/core';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private em: EntityManager,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Check system health',
    description: 'Returns database, memory heap, and disk storage status.',
  })
  @ApiResponse({ status: 200, description: 'Health check results.' })
  async check() {
    return this.health.check([
      async () => {
        try {
          await this.em.getConnection().execute('SELECT 1');
          return { database: { status: 'up' } };
        } catch (error) {
          return {
            database: { status: 'down', message: (error as Error).message },
          };
        }
      },
      () => this.memory.checkHeap('memory_heap', 256 * 1024 * 1024),
      () =>
        this.disk.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}
