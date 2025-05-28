import { Parser, ParseOptions, ParseResult } from '../types';
export declare class ExcelParser implements Parser {
    supportedMimeTypes: string[];
    supportedExtensions: string[];
    parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult>;
}
//# sourceMappingURL=excel-parser.d.ts.map