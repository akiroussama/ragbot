import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';
export declare class CodeChunker extends BaseChunkingStrategy {
    chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
    private detectLanguage;
}
//# sourceMappingURL=code-chunker.d.ts.map