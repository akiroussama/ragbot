import { Parser, ParseOptions, ParseResult } from '../types';
export declare class PDFParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=pdf-parser.d.ts.map