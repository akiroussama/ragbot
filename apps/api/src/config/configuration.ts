export default () => ({
  port: parseInt(process.env.API_PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL,
  },
  
  redis: {
    url: process.env.REDIS_URL,
    host: process.env.REDIS_URL?.split('@')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[3] || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001', 'http://localhost:3002'],
  },
  
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'noreply@chatbot-rag.com',
  },
  
  llm: {
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.DEFAULT_LLM_MODEL || 'gpt-4-turbo-preview',
  },
  
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  
  sentry: {
    dsn: process.env.SENTRY_DSN,
  },
  
  uploads: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
  },
  
  crawling: {
    maxDepth: parseInt(process.env.CRAWL_MAX_DEPTH || '3', 10),
    maxPages: parseInt(process.env.CRAWL_MAX_PAGES || '100', 10),
    timeout: parseInt(process.env.CRAWL_TIMEOUT || '30000', 10),
  },
  
  embedding: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || '1000', 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || '200', 10),
    batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '100', 10),
  },
});