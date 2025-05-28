import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantRequest } from '../middleware/tenant.middleware';

export const Tenant = createParamDecorator(
  (data: 'organizationId' | 'projectId' | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();
    const tenant = request.tenant;

    if (data) {
      return tenant?.[data];
    }

    return tenant;
  },
);