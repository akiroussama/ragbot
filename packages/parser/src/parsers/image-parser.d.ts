import { Parser, ParseOptions, ParseResult } from '../types';
export declare class ImageParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=image-parser.d.ts.map