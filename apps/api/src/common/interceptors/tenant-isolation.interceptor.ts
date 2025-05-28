import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TenantRequest } from '../middleware/tenant.middleware';

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenant = request.tenant;

    return next.handle().pipe(
      map((data) => {
        // Add tenant context to response if needed
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          return {
            ...data,
            _tenant: {
              organizationId: tenant?.organizationId,
              projectId: tenant?.projectId,
            },
          };
        }
        return data;
      }),
    );
  }
}