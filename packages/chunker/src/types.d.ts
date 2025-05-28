export interface ChunkOptions {
    chunkSize?: number;
    chunkOverlap?: number;
    minChunkSize?: number;
    maxChunkSize?: number;
    strategy?: ChunkingStrategy;
    preserveStructure?: boolean;
    language?: string;
    tokenizer?: 'tiktoken' | 'character';
    model?: string;
}
export declare enum ChunkingStrategy {
    RECURSIVE = "recursive",
    SEMANTIC = "semantic",
    SENTENCE = "sentence",
    PARAGRAPH = "paragraph",
    MARKDOWN = "markdown",
    CODE = "code",
    FIXED_SIZE = "fixed_size"
}
export interface Chunk {
    content: string;
    metadata: {
        index: number;
        startOffset: number;
        endOffset: number;
        tokens?: number;
        type?: string;
        headings?: string[];
        language?: string;
    };
}
export interface ChunkingResult {
    chunks: Chunk[];
    totalChunks: number;
    totalTokens?: number;
    metadata: {
        strategy: ChunkingStrategy;
        chunkSize: number;
        chunkOverlap: number;
        processingTime: number;
    };
}
//# sourceMappingURL=types.d.ts.map