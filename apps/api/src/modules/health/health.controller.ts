import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { prisma, redis, qdrant } from '@chatbot-rag/database';

@ApiTags('Health')
@Controller('health')
@Public()
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check for all services' })
  @ApiResponse({ status: 200, description: 'All services are ready' })
  @ApiResponse({ status: 503, description: 'One or more services are not ready' })
  async ready() {
    const checks = {
      database: false,
      redis: false,
      qdrant: false,
    };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    try {
      await redis.ping();
      checks.redis = true;
    } catch (error) {
      console.error('Redis health check failed:', error);
    }

    try {
      const collections = await qdrant.getCollections();
      checks.qdrant = true;
    } catch (error) {
      console.error('Qdrant health check failed:', error);
    }

    const allHealthy = Object.values(checks).every((status) => status);

    return {
      status: allHealthy ? 'ready' : 'not ready',
      checks,
      timestamp: new Date().toISOString(),
    };
  }
}