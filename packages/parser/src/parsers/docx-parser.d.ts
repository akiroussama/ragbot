import { Parser, ParseOptions, ParseResult } from '../types';
export declare class DOCXParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=docx-parser.d.ts.map