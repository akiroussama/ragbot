import { Parser, ParseOptions, ParseResult } from '../types';
export declare class TextParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=text-parser.d.ts.map