import * as XLSX from 'xlsx';
import { Parser, ParseOptions, ParseResult } from '../types';

export class ExcelParser implements Parser {
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  supportedExtensions = ['.xlsx', '.xls', '.xlsm'];

  async parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      let content = '';
      const sheetMetadata: any[] = [];

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
    } catch (error) {
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