import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma, Project } from '@chatbot-rag/database';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { generateApiKey, hashApiKey, DEFAULT_WIDGET_SETTINGS } from '@chatbot-rag/shared';
import { vectorStore } from '@chatbot-rag/database';

@Injectable()
export class ProjectsService {
  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    // Verify organization access
    const organization = await prisma.organization.findUnique({
      where: { id: dto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.ownerId !== userId) {
      throw new ForbiddenException('Access denied to organization');
    }

    // Check if slug exists within organization
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId: dto.organizationId,
          slug: dto.slug,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Project slug already exists in this organization');
    }

    // Check project limit based on subscription
    const projectCount = await prisma.project.count({
      where: { organizationId: dto.organizationId },
    });

    const limits = (organization.settings as any)?.limits;
    if (limits?.projectsPerOrg && projectCount >= limits.projectsPerOrg) {
      throw new ForbiddenException('Project limit reached for organization');
    }

    // Create project with default API key
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          organizationId: dto.organizationId,
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
          settings: dto.settings || {},
          widgetSettings: {
            ...DEFAULT_WIDGET_SETTINGS,
            ...dto.widgetSettings,
          },
        },
      });

      // Generate default API key
      const apiKey = generateApiKey();
      const keyHash = hashApiKey(apiKey);

      await tx.apiKey.create({
        data: {
          projectId: newProject.id,
          name: 'Default API Key',
          keyHash,
        },
      });

      // Initialize vector store collection for this project
      await vectorStore.initialize();

      return { ...newProject, apiKey };
    });

    return project;
  }

  async findAll(organizationId: string, userId: string, params?: {
    skip?: number;
    take?: number;
    search?: string;
  }) {
    // Verify organization access
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.ownerId !== userId) {
      throw new ForbiddenException('Access denied to organization');
    }

    const { skip = 0, take = 10, search } = params || {};

    const where = {
      organizationId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sources: true,
              conversations: true,
              apiKeys: {
                where: { isActive: true },
              },
            },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string, userId: string): Promise<Project> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
          },
        },
        sources: {
          select: {
            id: true,
            type: true,
            name: true,
            isActive: true,
            lastSyncedAt: true,
            _count: {
              select: {
                documents: true,
              },
            },
          },
        },
        apiKeys: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            conversations: true,
            jobs: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check access
    if (project.organization.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async findBySlug(organizationId: string, slug: string, userId: string): Promise<Project> {
    const project = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            ownerId: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.organization.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return project;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(id, userId);

    if (dto.slug && dto.slug !== project.slug) {
      const existing = await prisma.project.findUnique({
        where: {
          organizationId_slug: {
            organizationId: project.organizationId,
            slug: dto.slug,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Project slug already exists');
      }
    }

    return prisma.project.update({
      where: { id },
      data: {
        ...dto,
        widgetSettings: dto.widgetSettings
          ? { ...project.widgetSettings as any, ...dto.widgetSettings }
          : undefined,
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const project = await this.findOne(id, userId);

    // Check if project has active sources
    const activeSources = await prisma.source.count({
      where: {
        projectId: id,
        isActive: true,
      },
    });

    if (activeSources > 0) {
      throw new ConflictException('Cannot delete project with active sources');
    }

    // Delete from vector store
    await vectorStore.deleteByProject(id);

    // Delete project (cascades to related data)
    await prisma.project.delete({
      where: { id },
    });
  }

  async generateApiKey(projectId: string, userId: string, name: string) {
    await this.findOne(projectId, userId);

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        projectId,
        name,
        keyHash,
      },
    });

    return {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      apiKey, // Only returned on creation
      createdAt: apiKeyRecord.createdAt,
    };
  }

  async listApiKeys(projectId: string, userId: string) {
    await this.findOne(projectId, userId);

    return prisma.apiKey.findMany({
      where: {
        projectId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(projectId: string, userId: string, keyId: string) {
    await this.findOne(projectId, userId);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: keyId,
        projectId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    return { message: 'API key revoked successfully' };
  }

  async getStats(projectId: string, userId: string) {
    await this.findOne(projectId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalMessages,
      messagesToday,
      totalConversations,
      activeConversations,
      totalDocuments,
      totalSources,
    ] = await Promise.all([
      prisma.message.count({
        where: {
          conversation: { projectId },
        },
      }),
      prisma.message.count({
        where: {
          conversation: { projectId },
          createdAt: { gte: today },
        },
      }),
      prisma.conversation.count({
        where: { projectId },
      }),
      prisma.conversation.count({
        where: {
          projectId,
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      prisma.document.count({
        where: {
          source: { projectId },
        },
      }),
      prisma.source.count({
        where: { projectId },
      }),
    ]);

    return {
      messages: {
        total: totalMessages,
        today: messagesToday,
      },
      conversations: {
        total: totalConversations,
        active: activeConversations,
      },
      documents: totalDocuments,
      sources: totalSources,
    };
  }
}