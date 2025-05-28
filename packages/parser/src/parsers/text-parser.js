"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextParser = void 0;
const chardet_1 = require("chardet");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
class TextParser {
    supportedMimeTypes = [
        'text/plain',
        'text/html',
        'text/xml',
        'text/csv',
        'text/markdown',
        'application/json',
        'application/xml',
    ];
    supportedExtensions = ['.txt', '.text', '.md', '.markdown', '.log', '.json', '.xml', '.html', '.htm'];
    async parse(buffer, options) {
        try {
            // Detect encoding
            let encoding = options?.encoding;
            if (!encoding) {
                const detected = (0, chardet_1.detect)(buffer);
                encoding = detected || 'utf-8';
            }
            // Convert to UTF-8
            const content = iconv_lite_1.default.decode(buffer, encoding);
            const lines = content.split('\n');
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            return {
                content,
                metadata: {
                    encoding,
                    lineCount: lines.length,
                    wordCount,
                    fileSize: buffer.length,
                    mimeType: 'text/plain',
                },
            };
        }
        catch (error) {
            return {
                content: '',
                metadata: {
                    mimeType: 'text/plain',
                    fileSize: buffer.length,
                },
                error: `Failed to parse text file: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.TextParser = TextParser;
//# sourceMappingURL=text-parser.js.map