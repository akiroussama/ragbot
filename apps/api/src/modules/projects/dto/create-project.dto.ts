import { IsString, IsNotEmpty, IsOptional, IsObject, Matches, Length, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    description: 'Project name',
    example: 'Customer Support Bot',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  name: string;

  @ApiProperty({
    description: 'Project slug (URL-friendly identifier)',
    example: 'customer-support',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'AI-powered customer support chatbot for handling common queries',
  })
  @IsString()
  @IsOptional()
  @Length(0, 500)
  description?: string;

  @ApiPropertyOptional({
    description: 'Project settings',
    example: {
      defaultLanguage: 'en',
      enableAnalytics: true,
      maxConversationLength: 50,
    },
  })
  @IsObject()
  @IsOptional()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Widget settings',
    example: {
      theme: 'light',
      position: 'bottom-right',
      primaryColor: '#3B82F6',
      greetingMessage: 'Hello! How can I help you today?',
    },
  })
  @IsObject()
  @IsOptional()
  widgetSettings?: Record<string, any>;
}