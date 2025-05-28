"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
exports.generateSlug = generateSlug;
exports.truncateText = truncateText;
exports.sleep = sleep;
exports.chunk = chunk;
exports.parseUrl = parseUrl;
exports.isValidEmail = isValidEmail;
exports.formatBytes = formatBytes;
exports.debounce = debounce;
exports.calculateCosineSimilarity = calculateCosineSimilarity;
const crypto_1 = require("crypto");
function generateApiKey() {
    return `chatbot_${(0, crypto_1.randomBytes)(32).toString('hex')}`;
}
function hashApiKey(apiKey) {
    return (0, crypto_1.createHash)('sha256').update(apiKey).digest('hex');
}
function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
function parseUrl(url) {
    try {
        return new URL(url);
    }
    catch {
        return null;
    }
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
function calculateCosineSimilarity(a, b) {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dotProduct / (normA * normB);
}
//# sourceMappingURL=utils.js.map