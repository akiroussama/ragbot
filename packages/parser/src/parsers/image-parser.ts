import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { Parser, ParseOptions, ParseResult } from '../types';

export class ImageParser implements Parser {
  supportedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
  ];
  supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif'];

  async parse(buffer: Buffer, options?: ParseOptions): Promise<ParseResult> {
    if (!options?.ocrEnabled) {
      return {
        content: '',
        metadata: {
          mimeType: 'image/*',
          fileSize: buffer.length,
          ocrEnabled: false,
        },
      };
    }

    try {
      // Get image metadata
      const metadata = await sharp(buffer).metadata();

      // Preprocess image for better OCR results
      const processedBuffer = await sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();

      // Perform OCR
      const { data } = await Tesseract.recognize(processedBuffer, options.language || 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            // Log progress if needed
          }
        },
      });

      const wordCount = data.text.split(/\s+/).filter(word => word.length > 0).length;

      return {
        content: data.text,
        metadata: {
          mimeType: `image/${metadata.format}`,
          fileSize: buffer.length,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          wordCount,
          ocrConfidence: data.confidence,
          language: options.language || 'eng',
        },
      };
    } catch (error) {
      return {
        content: '',
        metadata: {
          mimeType: 'image/*',
          fileSize: buffer.length,
        },
        error: `Failed to parse image: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}