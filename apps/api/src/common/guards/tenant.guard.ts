import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@chatbot-rag/database';
import { TenantRequest } from '../middleware/tenant.middleware';

export const REQUIRE_TENANT_KEY = 'requireTenant';
export const RequireTenant = (type: 'organization' | 'project' | 'both' = 'both') =>
  Reflect.metadata(REQUIRE_TENANT_KEY, type);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireTenant = this.reflector.getAllAndOverride<string>(REQUIRE_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requireTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<TenantRequest>();
    const user = request.user;
    const tenant = request.tenant;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check organization access
    if (
      (requireTenant === 'organization' || requireTenant === 'both') &&
      tenant?.organizationId
    ) {
      const hasOrgAccess = await this.checkOrganizationAccess(
        tenant.organizationId,
        user.id,
      );

      if (!hasOrgAccess) {
        throw new ForbiddenException('Access denied to organization');
      }
    }

    // Check project access
    if (
      (requireTenant === 'project' || requireTenant === 'both') &&
      tenant?.projectId
    ) {
      const hasProjectAccess = await this.checkProjectAccess(
        tenant.projectId,
        user.id,
      );

      if (!hasProjectAccess) {
        throw new ForbiddenException('Access denied to project');
      }
    }

    return true;
  }

  private async checkOrganizationAccess(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerId: true },
    });

    if (!organization) {
      return false;
    }

    // Check if user is owner
    if (organization.ownerId === userId) {
      return true;
    }

    // Check if user has access through organization members (future implementation)
    // const member = await prisma.organizationMember.findUnique({
    //   where: {
    //     organizationId_userId: {
    //       organizationId,
    //       userId,
    //     },
    //   },
    // });

    return false;
  }

  private async checkProjectAccess(
    projectId: string,
    userId: string,
  ): Promise<boolean> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        organization: {
          select: { ownerId: true },
        },
      },
    });

    if (!project) {
      return false;
    }

    // Check if user is organization owner
    if (project.organization.ownerId === userId) {
      return true;
    }

    // Check if user has project-specific access (future implementation)
    // const access = await prisma.projectAccess.findUnique({
    //   where: {
    //     projectId_userId: {
    //       projectId,
    //       userId,
    //     },
    //   },
    // });

    return false;
  }
}