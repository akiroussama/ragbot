import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SourcesService } from './sources.service';

@ApiTags('Sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}
  // Controller implementation will be completed with other source types
}