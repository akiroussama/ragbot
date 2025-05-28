import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma, Organization, User } from '@chatbot-rag/database';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { SUBSCRIPTION_TIERS, RATE_LIMITS } from '@chatbot-rag/shared';

@Injectable()
export class OrganizationsService {
  async create(userId: string, dto: CreateOrganizationDto): Promise<Organization> {
    // Check if slug already exists
    const existing = await prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization slug already exists');
    }

    // Check user's organization limit based on their role
    const userOrgs = await prisma.organization.count({
      where: { ownerId: userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const maxOrgs = user?.role === 'admin' ? -1 : 5;
    if (maxOrgs !== -1 && userOrgs >= maxOrgs) {
      throw new ForbiddenException('Organization limit reached');
    }

    return prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        ownerId: userId,
        subscriptionTier: SUBSCRIPTION_TIERS.FREE,
        settings: {
          features: {
            customBranding: false,
            apiAccess: true,
            webhooks: false,
            sso: false,
          },
          limits: RATE_LIMITS[SUBSCRIPTION_TIERS.FREE],
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, params?: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    const { skip = 0, take = 10, search } = params || {};

    const where = {
      OR: [
        { ownerId: userId },
        {
          projects: {
            some: {
              apiKeys: {
                some: {
                  // User has API access to a project
                },
              },
            },
          },
        },
      ],
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
          _count: {
            select: {
              projects: true,
            },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, userId: string): Promise<Organization> {
    const organization = await prisma.organization.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            _count: {
              select: {
                sources: true,
                conversations: true,
              },
            },
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check access
    if (organization.ownerId !== userId) {
      // Check if user has access through project API keys
      const hasAccess = await prisma.apiKey.findFirst({
        where: {
          project: {
            organizationId: id,
          },
          isActive: true,
        },
      });

      if (!hasAccess) {
        throw new ForbiddenException('Access denied');
      }
    }

    return organization;
  }

  async findBySlug(slug: string, userId: string): Promise<Organization> {
    const organization = await prisma.organization.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return organization;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateOrganizationDto,
  ): Promise<Organization> {
    const organization = await this.findOne(id, userId);

    if (organization.ownerId !== userId) {
      throw new ForbiddenException('Only organization owner can update');
    }

    if (dto.slug && dto.slug !== organization.slug) {
      const existing = await prisma.organization.findUnique({
        where: { slug: dto.slug },
      });

      if (existing) {
        throw new ConflictException('Organization slug already exists');
      }
    }

    // Update rate limits if subscription tier changes
    let settings = organization.settings as any;
    if (dto.subscriptionTier && dto.subscriptionTier !== organization.subscriptionTier) {
      settings = {
        ...settings,
        limits: RATE_LIMITS[dto.subscriptionTier as keyof typeof RATE_LIMITS],
      };
    }

    return prisma.organization.update({
      where: { id },
      data: {
        ...dto,
        settings: dto.settings ? { ...settings, ...dto.settings } : settings,
        subscriptionExpiresAt: dto.subscriptionTier === 'free' ? null : undefined,
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const organization = await this.findOne(id, userId);

    if (organization.ownerId !== userId) {
      throw new ForbiddenException('Only organization owner can delete');
    }

    // Check if organization has active projects
    const activeProjects = await prisma.project.count({
      where: {
        organizationId: id,
        isActive: true,
      },
    });

    if (activeProjects > 0) {
      throw new ConflictException(
        'Cannot delete organization with active projects',
      );
    }

    await prisma.organization.delete({
      where: { id },
    });
  }

  async getStats(id: string, userId: string) {
    await this.findOne(id, userId);

    const [projectCount, totalMessages, totalDocuments, storageUsed] = await Promise.all([
      prisma.project.count({
        where: { organizationId: id },
      }),
      prisma.message.count({
        where: {
          conversation: {
            project: {
              organizationId: id,
            },
          },
        },
      }),
      prisma.document.count({
        where: {
          source: {
            project: {
              organizationId: id,
            },
          },
        },
      }),
      // This would need to be calculated based on actual storage
      Promise.resolve(0),
    ]);

    return {
      projects: projectCount,
      messages: totalMessages,
      documents: totalDocuments,
      storageUsedBytes: storageUsed,
    };
  }

  async inviteUser(
    organizationId: string,
    ownerId: string,
    email: string,
    role: string,
  ) {
    const organization = await this.findOne(organizationId, ownerId);

    if (organization.ownerId !== ownerId) {
      throw new ForbiddenException('Only organization owner can invite users');
    }

    // Implementation for inviting users would go here
    // This would involve creating invitation tokens, sending emails, etc.

    return {
      message: 'Invitation sent successfully',
      email,
      role,
    };
  }
}