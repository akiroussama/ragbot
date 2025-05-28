# Deploy to Render (FREE)

## Setup (10 minutes)

### 1. Prepare for Render

Create deployment-specific files:

**render.yaml** (in root):
```yaml
services:
  # API Backend
  - type: web
    name: chatbot-rag-api
    env: node
    plan: free
    buildCommand: npm install && npm run build:api
    startCommand: npm run start:api
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: chatbot-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          type: redis
          name: chatbot-redis
          property: connectionString
      - key: OPENAI_API_KEY
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: QDRANT_URL
        sync: false

  # Frontend
  - type: web
    name: chatbot-rag-web
    env: node
    plan: free
    buildCommand: npm install && npm run build:web
    startCommand: npm run start:web
    envVars:
      - key: NEXT_PUBLIC_API_URL
        value: https://chatbot-rag-api.onrender.com/api
      - key: API_URL
        value: https://chatbot-rag-api.onrender.com/api

databases:
  - name: chatbot-db
    plan: free
    databaseName: chatbot_rag
    user: postgres

  - name: chatbot-redis
    plan: free
```

### 2. Deploy Steps

1. **Visit**: https://render.com
2. Connect GitHub repository
3. Render will detect `render.yaml` and create all services
4. Set environment variables:
   - `OPENAI_API_KEY`: Your OpenAI key
   - `QDRANT_URL`: Free Qdrant Cloud URL
   - `QDRANT_API_KEY`: Your Qdrant key

### 3. Free Resources
- PostgreSQL (1GB)
- Redis (25MB)
- 2 web services
- Custom domains
- SSL certificates

### 4. Access
- **Frontend**: `https://chatbot-rag-web.onrender.com`
- **API**: `https://chatbot-rag-api.onrender.com`

---

## Render Free Limits
- 750 hours/month per service
- Services sleep after 15 minutes of inactivity
- 1GB RAM per service
- 10GB bandwidth/month