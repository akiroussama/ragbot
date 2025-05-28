import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueueService } from '@chatbot-rag/queue';
import { EventService } from '@chatbot-rag/events';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Express } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';

@Controller('documents')
@UseGuards(AuthGuard, TenantGuard)
export class DocumentsController {
  constructor(
    private readonly queueService: QueueService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  async getDocuments(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    // Implementation would fetch documents from database
    // For now, return mock data
    const mockDocuments = [
      {
        id: 'doc_1',
        fileName: 'sample-document.pdf',
        fileSize: 1024 * 1024, // 1MB
        mimeType: 'application/pdf',
        status: 'completed',
        chunks: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'doc_2',
        fileName: 'technical-guide.docx',
        fileSize: 512 * 1024, // 512KB
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        status: 'processing',
        chunks: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    let filteredDocuments = mockDocuments;
    
    if (status) {
      filteredDocuments = filteredDocuments.filter(doc => doc.status === status);
    }
    
    if (search) {
      filteredDocuments = filteredDocuments.filter(doc => 
        doc.fileName.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (offset || 0);
    const endIndex = startIndex + (limit || 20);
    const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

    return {
      documents: paginatedDocuments,
      total: filteredDocuments.length,
      limit: limit || 20,
      offset: offset || 0,
    };
  }

  @Get(':id')
  async getDocument(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    // Implementation would fetch specific document
    return {
      id: documentId,
      fileName: 'sample-document.pdf',
      fileSize: 1024 * 1024,
      mimeType: 'application/pdf',
      status: 'completed',
      chunks: 25,
      metadata: {
        pages: 10,
        language: 'en',
        author: 'Sample Author',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Unsupported file type: ${file.mimetype}`);
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    const documentId = uuidv4();
    const uploadDir = path.join(process.cwd(), 'uploads', req.tenantId);
    const fileName = `${documentId}_${file.originalname}`;
    const filePath = path.join(uploadDir, fileName);

    try {
      // Ensure upload directory exists
      await fs.mkdir(uploadDir, { recursive: true });
      
      // Save file
      await fs.writeFile(filePath, file.buffer);

      // Create document record (in real implementation, save to database)
      const document = {
        id: documentId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'processing',
        chunks: 0,
        filePath,
        tenantId: req.tenantId,
        userId: req.user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Publish document uploaded event
      await this.eventService.publishDocumentEvent(
        'document.uploaded',
        {
          documentId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          status: 'processing',
        },
        req.tenantId,
        req.user?.id,
      );

      // Queue document processing job
      await this.queueService.addDocumentProcessingJob({
        documentId,
        tenantId: req.tenantId,
        filePath,
        fileName: file.originalname,
        mimeType: file.mimetype,
        metadata: {
          userId: req.user?.id,
          uploadedAt: new Date().toISOString(),
        },
      });

      return {
        id: documentId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'processing',
        createdAt: document.createdAt,
        message: 'Document uploaded successfully and processing started',
      };
    } catch (error) {
      // Cleanup file if database save fails
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.error('Failed to cleanup file:', cleanupError);
      }
      throw error;
    }
  }

  @Patch(':id')
  async updateDocument(
    @Param('id') documentId: string,
    @Body() updateData: { fileName?: string; metadata?: any },
    @Request() req: any,
  ) {
    // Implementation would update document in database
    return {
      id: documentId,
      ...updateData,
      updatedAt: new Date().toISOString(),
      message: 'Document updated successfully',
    };
  }

  @Delete(':id')
  async deleteDocument(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    // Implementation would:
    // 1. Delete document record from database
    // 2. Delete physical file
    // 3. Delete associated chunks and embeddings
    // 4. Remove from vector store
    // 5. Publish deletion event

    await this.eventService.publishDocumentEvent(
      'document.deleted',
      {
        documentId,
        fileName: 'sample-document.pdf', // Would get from database
        fileSize: 1024 * 1024,
        mimeType: 'application/pdf',
      },
      req.tenantId,
      req.user?.id,
    );

    return {
      success: true,
      message: 'Document deleted successfully',
    };
  }

  @Get(':id/chunks')
  async getDocumentChunks(
    @Param('id') documentId: string,
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    // Implementation would fetch chunks for document
    return {
      chunks: [],
      total: 0,
      limit: limit || 50,
      offset: offset || 0,
    };
  }

  @Post(':id/reprocess')
  async reprocessDocument(
    @Param('id') documentId: string,
    @Request() req: any,
  ) {
    // Implementation would requeue document for processing
    await this.queueService.addDocumentProcessingJob({
      documentId,
      tenantId: req.tenantId,
      filePath: '/path/to/file', // Would get from database
      fileName: 'sample-document.pdf',
      mimeType: 'application/pdf',
      metadata: {
        reprocessing: true,
        userId: req.user?.id,
      },
    });

    return {
      success: true,
      message: 'Document reprocessing started',
    };
  }
}