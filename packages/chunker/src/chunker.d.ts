import { ChunkOptions, ChunkingResult, ChunkingStrategy } from './types';
export declare class IntelligentChunker {
    private strategies;
    chunk(text: string, options?: ChunkOptions): Promise<ChunkingResult>;
    private detectBestStrategy;
    getSupportedStrategies(): ChunkingStrategy[];
}
//# sourceMappingURL=chunker.d.ts.map