import { ParseOptions, ParseResult } from './types';
export declare class ParserFactory {
    private static parsers;
    static parse(buffer: Buffer, filename?: string, options?: ParseOptions): Promise<ParseResult>;
    private static getParserForMimeType;
    private static getParserForFilename;
    static getSupportedFormats(): {
        mimeTypes: string[];
        extensions: string[];
    };
}
//# sourceMappingURL=parser-factory.d.ts.map