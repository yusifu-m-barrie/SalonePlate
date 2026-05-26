import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { ok: true, service: 'saloneplate-api', timestamp: new Date().toISOString() };
  }
}
