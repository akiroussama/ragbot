export interface ParseOptions {
    encoding?: string;
    language?: string;
    extractMetadata?: boolean;
    ocrEnabled?: boolean;
    maxPages?: number;
}
export interface ParseResult {
    content: string;
    metadata: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        createdDate?: Date;
        modifiedDate?: Date;
        pageCount?: number;
        wordCount?: number;
        language?: string;
        fileSize?: number;
        mimeType?: string;
        [key: string]: any;
    };
    pages?: ParsedPage[];
    error?: string;
}
export interface ParsedPage {
    pageNumber: number;
    content: string;
    metadata?: Record<string, any>;
}
export interface Parser {
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
    supportedMimeTypes: string[];
    supportedExtensions: string[];
}
//# sourceMappingURL=types.d.ts.map