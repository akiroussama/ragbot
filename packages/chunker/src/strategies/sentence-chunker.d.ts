import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';
export declare class SentenceChunker extends BaseChunkingStrategy {
    chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
}
//# sourceMappingURL=sentence-chunker.d.ts.map