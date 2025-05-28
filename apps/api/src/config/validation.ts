import * as Joi from 'joi';

export const validate = (config: Record<string, any>) => {
  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid('development', 'production', 'test')
      .default('development'),
    API_PORT: Joi.number().default(3000),
    API_PREFIX: Joi.string().default('/api/v1'),
    
    DATABASE_URL: Joi.string().required(),
    REDIS_URL: Joi.string().required(),
    REDIS_PASSWORD: Joi.string().allow(''),
    
    QDRANT_URL: Joi.string().required(),
    QDRANT_API_KEY: Joi.string().allow(''),
    
    JWT_SECRET: Joi.string().required(),
    JWT_REFRESH_SECRET: Joi.string().required(),
    JWT_EXPIRES_IN: Joi.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
    
    THROTTLE_TTL: Joi.number().default(60),
    THROTTLE_LIMIT: Joi.number().default(100),
    
    CORS_ORIGINS: Joi.string().default('http://localhost:3001,http://localhost:3002'),
    
    SMTP_HOST: Joi.string().required(),
    SMTP_PORT: Joi.number().default(587),
    SMTP_USER: Joi.string().required(),
    SMTP_PASS: Joi.string().required(),
    EMAIL_FROM: Joi.string().email().default('noreply@chatbot-rag.com'),
    
    OPENAI_API_KEY: Joi.string().allow(''),
    ANTHROPIC_API_KEY: Joi.string().allow(''),
    DEFAULT_LLM_MODEL: Joi.string().default('gpt-4-turbo-preview'),
    
    STRIPE_SECRET_KEY: Joi.string().allow(''),
    STRIPE_WEBHOOK_SECRET: Joi.string().allow(''),
    
    SENTRY_DSN: Joi.string().allow(''),
    
    MAX_FILE_SIZE: Joi.number().default(10485760),
    CRAWL_MAX_DEPTH: Joi.number().default(3),
    CRAWL_MAX_PAGES: Joi.number().default(100),
    CRAWL_TIMEOUT: Joi.number().default(30000),
    
    CHUNK_SIZE: Joi.number().default(1000),
    CHUNK_OVERLAP: Joi.number().default(200),
    EMBEDDING_BATCH_SIZE: Joi.number().default(100),
  });

  const { error, value } = schema.validate(config, { abortEarly: false });

  if (error) {
    throw new Error(
      `Config validation error: ${error.details.map((x) => x.message).join(', ')}`,
    );
  }

  return value;
};