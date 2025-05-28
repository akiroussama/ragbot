"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCXParser = void 0;
const mammoth_1 = __importDefault(require("mammoth"));
class DOCXParser {
    supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
    ];
    supportedExtensions = ['.docx', '.doc'];
    async parse(buffer, options) {
        try {
            const result = await mammoth_1.default.extractRawText({ buffer });
            if (result.messages.length > 0) {
                console.warn('DOCX parsing warnings:', result.messages);
            }
            const content = result.value;
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            // Extract metadata if requested
            let metadata = {
                wordCount,
                fileSize: buffer.length,
                mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            };
            if (options?.extractMetadata) {
                // Mammoth doesn't provide metadata, but we can extract some basic info
                const lines = content.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    // Assume first line might be title
                    metadata.title = lines[0].substring(0, 100);
                }
            }
            return {
                content,
                metadata,
            };
        }
        catch (error) {
            return {
                content: '',
                metadata: {
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    fileSize: buffer.length,
                },
                error: `Failed to parse DOCX: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.DOCXParser = DOCXParser;
//# sourceMappingURL=docx-parser.js.map