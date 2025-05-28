import { Chunk, ChunkOptions } from '../types';
export declare abstract class BaseChunkingStrategy {
    abstract chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
    protected countTokens(text: string, options: Required<ChunkOptions>): number;
    protected createChunk(content: string, index: number, startOffset: number, endOffset: number, options: Required<ChunkOptions>, additionalMetadata?: Record<string, any>): Chunk;
    protected splitIntoChunks(text: string, separator: string, options: Required<ChunkOptions>): Chunk[];
    protected getOverlapText(text: string, options: Required<ChunkOptions>): string;
}
//# sourceMappingURL=base-strategy.d.ts.map