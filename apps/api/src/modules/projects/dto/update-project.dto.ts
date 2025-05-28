import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['organizationId'] as const),
) {
  @ApiPropertyOptional({
    description: 'Whether the project is active',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}