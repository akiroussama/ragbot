import { Parser, ParseOptions, ParseResult } from '../types';
export declare class CSVParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=csv-parser.d.ts.map