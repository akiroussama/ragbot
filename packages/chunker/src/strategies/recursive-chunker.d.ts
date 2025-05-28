import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';
export declare class RecursiveChunker extends BaseChunkingStrategy {
    chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
}
//# sourceMappingURL=recursive-chunker.d.ts.map