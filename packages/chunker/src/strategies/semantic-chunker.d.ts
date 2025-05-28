import { BaseChunkingStrategy } from './base-strategy';
import { Chunk, ChunkOptions } from '../types';
export declare class SemanticChunker extends BaseChunkingStrategy {
    chunk(text: string, options: Required<ChunkOptions>): Promise<Chunk[]>;
    private getOverlapSentences;
}
//# sourceMappingURL=semantic-chunker.d.ts.map