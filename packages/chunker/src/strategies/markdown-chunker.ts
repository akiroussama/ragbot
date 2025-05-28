import { MarkdownTextSplitter } from '@langchain/textsplitters';
import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class MarkdownChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    const splitter = new MarkdownTextSplitter({
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });

    const documents = await splitter.createDocuments([text]);
    const chunks: Chunk[] = [];

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const content = doc.pageContent;
      const startOffset = text.indexOf(content);
      const endOffset = startOffset + content.length;

      // Extract headings from the chunk
      const headings = this.extractHeadings(content);

      chunks.push(
        this.createChunk(
          content,
          i,
          startOffset,
          endOffset,
          options,
          {
            type: 'markdown',
            headings,
          },
        ),
      );
    }

    return chunks;
  }

  private extractHeadings(content: string): string[] {
    const headingRegex = /^#{1,6}\s+(.+)$/gm;
    const headings: string[] = [];
    let match;

    while ((match = headingRegex.exec(content)) !== null) {
      headings.push(match[1].trim());
    }

    return headings;
  }
}