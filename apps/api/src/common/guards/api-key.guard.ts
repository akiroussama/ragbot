import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { prisma } from '@chatbot-rag/database';
import { createHash } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        isActive: true,
      },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    request.apiKey = apiKeyRecord;
    request.project = apiKeyRecord.project;
    request.organization = apiKeyRecord.project.organization;

    return true;
  }
}