import { Injectable, Scope } from '@nestjs/common';
import { prisma, Organization, Project } from '@chatbot-rag/database';
import { RATE_LIMITS } from '@chatbot-rag/shared';

export interface TenantContext {
  organizationId?: string;
  projectId?: string;
  organization?: Organization;
  project?: Project;
  limits?: any;
}

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  private context: TenantContext = {};

  setContext(context: Partial<TenantContext>) {
    this.context = { ...this.context, ...context };
  }

  getContext(): TenantContext {
    return this.context;
  }

  getOrganizationId(): string | undefined {
    return this.context.organizationId;
  }

  getProjectId(): string | undefined {
    return this.context.projectId;
  }

  async loadOrganization(organizationId: string): Promise<Organization | null> {
    if (!organizationId) return null;

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (organization) {
      this.context.organization = organization;
      this.context.organizationId = organizationId;
      this.context.limits = this.extractLimits(organization);
    }

    return organization;
  }

  async loadProject(projectId: string): Promise<Project | null> {
    if (!projectId) return null;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
      },
    });

    if (project) {
      this.context.project = project;
      this.context.projectId = projectId;
      this.context.organization = project.organization;
      this.context.organizationId = project.organizationId;
      this.context.limits = this.extractLimits(project.organization);
    }

    return project;
  }

  async checkLimit(resource: string, current: number): Promise<boolean> {
    const limits = this.context.limits;
    if (!limits) return true;

    const limit = limits[resource];
    if (limit === -1) return true; // Unlimited
    
    return current < limit;
  }

  async enforceLimit(resource: string, current: number): Promise<void> {
    const canProceed = await this.checkLimit(resource, current);
    if (!canProceed) {
      throw new Error(`${resource} limit reached for current subscription tier`);
    }
  }

  async getUsage(): Promise<Record<string, any>> {
    if (!this.context.organizationId) {
      return {};
    }

    const [projects, messages, documents] = await Promise.all([
      prisma.project.count({
        where: { organizationId: this.context.organizationId },
      }),
      prisma.message.count({
        where: {
          conversation: {
            project: {
              organizationId: this.context.organizationId,
            },
          },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.document.count({
        where: {
          source: {
            project: {
              organizationId: this.context.organizationId,
            },
          },
        },
      }),
    ]);

    return {
      projects,
      messagestoday: messages,
      documents,
    };
  }

  private extractLimits(organization: Organization): any {
    const tier = organization.subscriptionTier || 'free';
    const customLimits = (organization.settings as any)?.limits || {};
    const defaultLimits = RATE_LIMITS[tier as keyof typeof RATE_LIMITS] || RATE_LIMITS.free;
    
    return {
      ...defaultLimits,
      ...customLimits,
    };
  }

  // Data isolation helpers
  addOrganizationFilter(query: any): any {
    if (!this.context.organizationId) return query;

    return {
      ...query,
      where: {
        ...query.where,
        organizationId: this.context.organizationId,
      },
    };
  }

  addProjectFilter(query: any): any {
    if (!this.context.projectId) return query;

    return {
      ...query,
      where: {
        ...query.where,
        projectId: this.context.projectId,
      },
    };
  }

  validateOrganizationAccess(organizationId: string): boolean {
    return this.context.organizationId === organizationId;
  }

  validateProjectAccess(projectId: string): boolean {
    return this.context.projectId === projectId;
  }
}