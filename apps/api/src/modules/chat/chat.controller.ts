import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from '@chatbot-rag/chat';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  ChatRequest,
  ChatResponse,
  StreamChatResponse,
} from '@chatbot-rag/chat';

@Controller('chat')
@UseGuards(AuthGuard, TenantGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(
    @Body() chatRequest: ChatRequest,
    @Request() req: any,
  ): Promise<ChatResponse> {
    const requestWithTenant = {
      ...chatRequest,
      tenantId: req.tenantId,
      userId: req.user?.id,
    };

    return this.chatService.chat(requestWithTenant);
  }

  @Post('stream')
  async streamChat(
    @Body() chatRequest: ChatRequest,
    @Request() req: any,
    @Res() res: Response,
  ): Promise<void> {
    const requestWithTenant = {
      ...chatRequest,
      tenantId: req.tenantId,
      userId: req.user?.id,
    };

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    const observable = await this.chatService.streamChat(requestWithTenant);
    
    observable.subscribe({
      next: (data: StreamChatResponse) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      },
      error: (error) => {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message,
        })}\n\n`);
        res.end();
      },
      complete: () => {
        res.end();
      },
    });
  }

  @Get('conversations')
  async getConversations(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Implementation would fetch conversations for the tenant
    return {
      conversations: [],
      total: 0,
      limit: limit || 20,
      offset: offset || 0,
    };
  }

  @Post('conversations')
  async createConversation(
    @Body() body: { title?: string },
    @Request() req: any,
  ) {
    // Implementation would create a new conversation
    return {
      id: 'conv_' + Date.now(),
      tenantId: req.tenantId,
      userId: req.user?.id,
      title: body.title,
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    // Implementation would fetch specific conversation
    return {
      id: conversationId,
      tenantId: req.tenantId,
      title: 'Sample Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
      messageCount: 0,
    };
  }

  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') conversationId: string,
    @Request() req: any,
  ) {
    // Implementation would delete conversation
    return { success: true };
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') conversationId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Implementation would fetch messages for conversation
    return {
      messages: [],
      total: 0,
      limit: limit || 50,
      offset: offset || 0,
    };
  }
}