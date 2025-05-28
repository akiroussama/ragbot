"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserFactory = void 0;
const file_type_1 = require("file-type");
const mimeTypes = __importStar(require("mime-types"));
const pdf_parser_1 = require("./parsers/pdf-parser");
const docx_parser_1 = require("./parsers/docx-parser");
const text_parser_1 = require("./parsers/text-parser");
const image_parser_1 = require("./parsers/image-parser");
const excel_parser_1 = require("./parsers/excel-parser");
const csv_parser_1 = require("./parsers/csv-parser");
class ParserFactory {
    static parsers = new Map([
        ['pdf', new pdf_parser_1.PDFParser()],
        ['docx', new docx_parser_1.DOCXParser()],
        ['text', new text_parser_1.TextParser()],
        ['image', new image_parser_1.ImageParser()],
        ['excel', new excel_parser_1.ExcelParser()],
        ['csv', new csv_parser_1.CSVParser()],
    ]);
    static async parse(buffer, filename, options) {
        try {
            // Detect file type from buffer
            const fileType = await (0, file_type_1.fileTypeFromBuffer)(buffer);
            let mimeType = fileType?.mime;
            // Fallback to filename-based detection
            if (!mimeType && filename) {
                mimeType = mimeTypes.lookup(filename) || undefined;
            }
            // Find appropriate parser
            const parser = this.getParserForMimeType(mimeType) || this.getParserForFilename(filename);
            if (!parser) {
                // Default to text parser for unknown types
                const textParser = this.parsers.get('text');
                return await textParser.parse(buffer, options);
            }
            return await parser.parse(buffer, options);
        }
        catch (error) {
            return {
                content: '',
                metadata: {
                    fileSize: buffer.length,
                },
                error: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
    static getParserForMimeType(mimeType) {
        if (!mimeType)
            return null;
        for (const parser of this.parsers.values()) {
            if (parser.supportedMimeTypes.some(type => mimeType.includes(type))) {
                return parser;
            }
        }
        return null;
    }
    static getParserForFilename(filename) {
        if (!filename)
            return null;
        const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
        if (!extension)
            return null;
        for (const parser of this.parsers.values()) {
            if (parser.supportedExtensions.includes(extension)) {
                return parser;
            }
        }
        return null;
    }
    static getSupportedFormats() {
        const mimeTypes = new Set();
        const extensions = new Set();
        for (const parser of this.parsers.values()) {
            parser.supportedMimeTypes.forEach(type => mimeTypes.add(type));
            parser.supportedExtensions.forEach(ext => extensions.add(ext));
        }
        return {
            mimeTypes: Array.from(mimeTypes),
            extensions: Array.from(extensions),
        };
    }
}
exports.ParserFactory = ParserFactory;
//# sourceMappingURL=parser-factory.js.map