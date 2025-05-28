import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@chatbot-rag/database';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        subscriptionTier: 'free',
        owner: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'john@example.com',
          username: 'john_doe',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Organization slug already exists' })
  @ApiResponse({ status: 403, description: 'Organization limit reached' })
  create(@CurrentUser() user: User, @Body() dto: CreateOrganizationDto) {
    return this.organizationsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all organizations for current user' })
  @ApiQuery({ name: 'skip', required: false, type: Number, default: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, default: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Organizations retrieved successfully',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Acme Corporation',
            slug: 'acme-corp',
            subscriptionTier: 'pro',
            owner: {
              id: '123e4567-e89b-12d3-a456-426614174001',
              email: 'john@example.com',
              username: 'john_doe',
            },
            _count: {
              projects: 5,
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
        skip: 0,
        take: 10,
      },
    },
  })
  findAll(
    @CurrentUser() user: User,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.organizationsService.findAll(user.id, { skip, take, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Acme Corporation',
        slug: 'acme-corp',
        subscriptionTier: 'pro',
        owner: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          email: 'john@example.com',
          username: 'john_doe',
        },
        projects: [
          {
            id: '123e4567-e89b-12d3-a456-426614174002',
            name: 'Main Website',
            slug: 'main-website',
            isActive: true,
            _count: {
              sources: 10,
              conversations: 1000,
            },
          },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.organizationsService.findOne(id, user.id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get organization by slug' })
  @ApiParam({ name: 'slug', type: String, description: 'Organization slug' })
  @ApiResponse({
    status: 200,
    description: 'Organization retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findBySlug(@Param('slug') slug: string, @CurrentUser() user: User) {
    return this.organizationsService.findBySlug(slug, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Only owner can update' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Organization deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Only owner can delete' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete organization with active projects',
  })
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.organizationsService.delete(id, user.id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        projects: 5,
        messages: 10000,
        documents: 500,
        storageUsedBytes: 1073741824,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  getStats(@Param('id') id: string, @CurrentUser() user: User) {
    return this.organizationsService.getStats(id, user.id);
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Invite user to organization' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Invitation sent successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Only owner can invite users' })
  inviteUser(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: { email: string; role: string },
  ) {
    return this.organizationsService.inviteUser(id, user.id, dto.email, dto.role);
  }
}