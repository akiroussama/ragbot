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
exports.ExcelParser = void 0;
const XLSX = __importStar(require("xlsx"));
class ExcelParser {
    supportedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
    ];
    supportedExtensions = ['.xlsx', '.xls', '.xlsm'];
    async parse(buffer, options) {
        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            let content = '';
            const sheetMetadata = [];
            // Process each sheet
            for (const sheetName of workbook.SheetNames) {
                const worksheet = workbook.Sheets[sheetName];
                // Convert to CSV format for text extraction
                const csv = XLSX.utils.sheet_to_csv(worksheet);
                content += `\n\n--- Sheet: ${sheetName} ---\n${csv}`;
                if (options?.extractMetadata) {
                    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
                    sheetMetadata.push({
                        name: sheetName,
                        rows: range.e.r - range.s.r + 1,
                        columns: range.e.c - range.s.c + 1,
                    });
                }
            }
            const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
            return {
                content: content.trim(),
                metadata: {
                    sheetCount: workbook.SheetNames.length,
                    sheets: options?.extractMetadata ? sheetMetadata : undefined,
                    wordCount,
                    fileSize: buffer.length,
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                },
            };
        }
        catch (error) {
            return {
                content: '',
                metadata: {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    fileSize: buffer.length,
                },
                error: `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
exports.ExcelParser = ExcelParser;
//# sourceMappingURL=excel-parser.js.map