import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';
export declare class ParagraphChunker extends BaseChunkingStrategy {
    chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
    private splitLargeParagraph;
}
//# sourceMappingURL=paragraph-chunker.d.ts.map