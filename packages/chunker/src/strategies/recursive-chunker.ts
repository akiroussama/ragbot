import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';

export class RecursiveChunker extends BaseChunkingStrategy {
  async chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
      separators: ['\n\n', '\n', '. ', ', ', ' ', ''],
    });

    const documents = await splitter.createDocuments([text]);
    
    return documents.map((doc, index) => {
      const startOffset = text.indexOf(doc.pageContent);
      const endOffset = startOffset + doc.pageContent.length;
      
      return this.createChunk(
        doc.pageContent,
        index,
        startOffset,
        endOffset,
        options,
        { type: 'recursive' },
      );
    });
  }
}