export declare function generateApiKey(): string;
export declare function hashApiKey(apiKey: string): string;
export declare function generateSlug(text: string): string;
export declare function truncateText(text: string, maxLength: number): string;
export declare function sleep(ms: number): Promise<void>;
export declare function chunk<T>(array: T[], size: number): T[][];
export declare function parseUrl(url: string): URL | null;
export declare function isValidEmail(email: string): boolean;
export declare function formatBytes(bytes: number, decimals?: number): string;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
export declare function calculateCosineSimilarity(a: number[], b: number[]): number;
//# sourceMappingURL=utils.d.ts.map