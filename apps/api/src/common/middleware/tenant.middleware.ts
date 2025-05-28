import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface TenantRequest extends Request {
  tenant?: {
    organizationId?: string;
    projectId?: string;
  };
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, res: Response, next: NextFunction) {
    // Extract tenant information from various sources
    const organizationId = 
      req.headers['x-organization-id'] as string ||
      req.query.organizationId as string ||
      req.params.organizationId;

    const projectId = 
      req.headers['x-project-id'] as string ||
      req.query.projectId as string ||
      req.params.projectId;

    // Attach tenant context to request
    req.tenant = {
      organizationId,
      projectId,
    };

    next();
  }
}