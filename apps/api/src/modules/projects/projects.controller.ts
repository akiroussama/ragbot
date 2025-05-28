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
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@chatbot-rag/database';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        organizationId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Customer Support Bot',
        slug: 'customer-support',
        description: 'AI-powered customer support chatbot',
        apiKey: 'chatbot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        isActive: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied or limit reached' })
  @ApiResponse({ status: 409, description: 'Project slug already exists' })
  create(@CurrentUser() user: User, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get all projects in an organization' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiQuery({ name: 'skip', required: false, type: Number, default: 0 })
  @ApiQuery({ name: 'take', required: false, type: Number, default: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Projects retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findAll(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: User,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(10), ParseIntPipe) take: number,
    @Query('search') search?: string,
  ) {
    return this.projectsService.findAll(organizationId, user.id, { skip, take, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.findOne(id, user.id);
  }

  @Get('organization/:organizationId/slug/:slug')
  @ApiOperation({ summary: 'Get project by organization and slug' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({
    status: 200,
    description: 'Project retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  findBySlug(
    @Param('organizationId') organizationId: string,
    @Param('slug') slug: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.findBySlug(organizationId, slug, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update project' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({
    status: 409,
    description: 'Cannot delete project with active sources',
  })
  delete(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.delete(id, user.id);
  }

  @Post(':id/api-keys')
  @ApiOperation({ summary: 'Generate new API key for project' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 201,
    description: 'API key generated successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Production API Key',
        apiKey: 'chatbot_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  generateApiKey(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('name') name: string,
  ) {
    return this.projectsService.generateApiKey(id, user.id, name);
  }

  @Get(':id/api-keys')
  @ApiOperation({ summary: 'List API keys for project' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'API keys retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  listApiKeys(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.listApiKeys(id, user.id);
  }

  @Delete(':id/api-keys/:keyId')
  @ApiOperation({ summary: 'Revoke API key' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiParam({ name: 'keyId', type: String, description: 'API Key ID' })
  @ApiResponse({
    status: 200,
    description: 'API key revoked successfully',
  })
  @ApiResponse({ status: 404, description: 'Project or API key not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  revokeApiKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
    @CurrentUser() user: User,
  ) {
    return this.projectsService.revokeApiKey(id, user.id, keyId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project statistics' })
  @ApiParam({ name: 'id', type: String, description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        messages: {
          total: 10000,
          today: 150,
        },
        conversations: {
          total: 500,
          active: 25,
        },
        documents: 250,
        sources: 10,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Project not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  getStats(@Param('id') id: string, @CurrentUser() user: User) {
    return this.projectsService.getStats(id, user.id);
  }
}