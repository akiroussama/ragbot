import { PartialType } from '@nestjs/swagger';
import { CreateOrganizationDto } from './create-organization.dto';
import { IsObject, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  @ApiPropertyOptional({
    description: 'Organization settings',
    example: { theme: 'dark', language: 'en' },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Subscription tier',
    enum: ['free', 'starter', 'pro', 'enterprise'],
    example: 'pro',
  })
  @IsOptional()
  @IsEnum(['free', 'starter', 'pro', 'enterprise'])
  subscriptionTier?: string;
}