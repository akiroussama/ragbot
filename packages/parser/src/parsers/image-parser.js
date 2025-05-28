"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageParser = void 0;
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const sharp_1 = __importDefault(require("sharp"));
class ImageParser {
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
    async parse(buffer, options) {
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
            const metadata = await (0, sharp_1.default)(buffer).metadata();
            // Preprocess image for better OCR results
            const processedBuffer = await (0, sharp_1.default)(buffer)
                .grayscale()
                .normalize()
                .sharpen()
                .toBuffer();
            // Perform OCR
            const { data } = await tesseract_js_1.default.recognize(processedBuffer, options.language || 'eng', {
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
        }
        catch (error) {
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
exports.ImageParser = ImageParser;
//# sourceMappingURL=image-parser.js.map