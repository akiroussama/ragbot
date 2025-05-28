import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantResolver } from './tenant.resolver';

@Global()
@Module({
  providers: [TenantService, TenantResolver],
  exports: [TenantService],
})
export class TenantModule {}