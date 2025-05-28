"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSVParser = void 0;
const sync_1 = require("csv-parse/sync");
const chardet_1 = require("chardet");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
class CSVParser {
    supportedMimeTypes = ['text/csv', 'application/csv'];
    supportedExtensions = ['.csv'];
    async parse(buffer, options) {
        try {
            // Detect encoding
            let encoding = options?.encoding;
            if (!encoding) {
                const detected = (0, chardet_1.detect)(buffer);
                encoding = detected || 'utf-8';
            }
            // Convert to UTF-8
            const csvString = iconv_lite_1.default.decode(buffer, encoding);
            // Parse CSV
            const records = (0, sync_1.parse)(csvString, {
                columns: true,
                skip_empty_lines: true,
                relaxed_column_count: true,
            });
            // Convert to readable format
            let content = '';
            if (records.length > 0) {
                const headers = Object.keys(records[0]);
                content = headers.join(' | ') + '\n';
                content += headers.map(() => '---').join(' | ') + '\n';
                for (const record of records) {
                    content += headers.map(h => record[h] || '').join(' | ') + '\n';
                }
            }
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            return {
                content,
                metadata: {
                    encoding,
                    rowCount: records.length,
                    columnCount: records.length > 0 ? Object.keys(records[0]).length : 0,
                    columns: records.length > 0 ? Object.keys(records[0]) : [],
                    wordCount,
                    fileSize: buffer.length,
                    mimeType: 'text/csv',
                },
            };
        }
        catch (error) {
            return {
                content: '',
                metadata: {
                    mimeType: 'text/csv',
                    fileSize: buffer.length,
                },
                error: `Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.CSVParser = CSVParser;
//# sourceMappingURL=csv-parser.js.map