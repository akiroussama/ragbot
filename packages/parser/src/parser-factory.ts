import { fileTypeFromBuffer } from 'file-type';
import * as mimeTypes from 'mime-types';
import { Parser, ParseOptions, ParseResult } from './types';
import { PDFParser } from './parsers/pdf-parser';
import { DOCXParser } from './parsers/docx-parser';
import { TextParser } from './parsers/text-parser';
import { ImageParser } from './parsers/image-parser';
import { ExcelParser } from './parsers/excel-parser';
import { CSVParser } from './parsers/csv-parser';

export class ParserFactory {
  private static parsers: Map<string, Parser> = new Map([
    ['pdf', new PDFParser()],
    ['docx', new DOCXParser()],
    ['text', new TextParser()],
    ['image', new ImageParser()],
    ['excel', new ExcelParser()],
    ['csv', new CSVParser()],
  ]);

  static async parse(
    buffer: Buffer,
    filename?: string,
    options?: ParseOptions,
  ): Promise<ParseResult> {
    try {
      // Detect file type from buffer
      const fileType = await fileTypeFromBuffer(buffer);
      let mimeType = fileType?.mime;

      // Fallback to filename-based detection
      if (!mimeType && filename) {
        mimeType = mimeTypes.lookup(filename) || undefined;
      }

      // Find appropriate parser
      const parser = this.getParserForMimeType(mimeType) || this.getParserForFilename(filename);

      if (!parser) {
        // Default to text parser for unknown types
        const textParser = this.parsers.get('text')!;
        return await textParser.parse(buffer, options);
      }

      return await parser.parse(buffer, options);
    } catch (error) {
      return {
        content: '',
        metadata: {
          fileSize: buffer.length,
        },
        error: `Failed to parse file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private static getParserForMimeType(mimeType?: string): Parser | null {
    if (!mimeType) return null;

    for (const parser of this.parsers.values()) {
      if (parser.supportedMimeTypes.some(type => mimeType.includes(type))) {
        return parser;
      }
    }

    return null;
  }

  private static getParserForFilename(filename?: string): Parser | null {
    if (!filename) return null;

    const extension = filename.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!extension) return null;

    for (const parser of this.parsers.values()) {
      if (parser.supportedExtensions.includes(extension)) {
        return parser;
      }
    }

    return null;
  }

  static getSupportedFormats(): {
    mimeTypes: string[];
    extensions: string[];
  } {
    const mimeTypes = new Set<string>();
    const extensions = new Set<string>();

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