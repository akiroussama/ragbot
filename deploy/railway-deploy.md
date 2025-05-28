# Deploy to Railway (FREE)

## Quick Deploy (5 minutes)

### 1. Prepare Repository
```bash
# Ensure clean git state
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy Services

**Visit**: https://railway.app

#### Deploy Database & Redis
1. Create new project
2. Add **PostgreSQL** service:
   - Click "+ New"
   - Select "Database" → "PostgreSQL"
   - Note the connection details

3. Add **Redis** service:
   - Click "+ New" 
   - Select "Database" → "Redis"
   - Note the connection details

#### Deploy API Backend
1. Click "+ New" → "GitHub Repo"
2. Connect your repository
3. Select root directory
4. Add environment variables:

```bash
# Required Environment Variables
NODE_ENV=production
PORT=3000

# Database (from Railway PostgreSQL service)
DATABASE_URL=postgresql://postgres:password@host:port/railway

# Redis (from Railway Redis service) 
REDIS_URL=redis://default:password@host:port

# Vector Database (use free Qdrant Cloud)
QDRANT_URL=https://your-cluster.qdrant.tech
QDRANT_API_KEY=your-api-key

# AI Provider (required)
OPENAI_API_KEY=sk-your-openai-key

# Security
JWT_SECRET=your-secure-random-string-here
JWT_REFRESH_SECRET=another-secure-random-string

# Features
CHAT_DEFAULT_PROVIDER=openai
CHAT_DEFAULT_MODEL=gpt-3.5-turbo
ENABLE_RETRIEVAL=true
ENABLE_WEBHOOKS=false
ENABLE_ANALYTICS=true

# File Upload
MAX_FILE_SIZE=10MB
```

5. Set build command:
```bash
# In Railway settings
Build Command: npm run build:api
Start Command: npm run start:api
```

#### Deploy Web Frontend
1. Click "+ New" → "GitHub Repo" (same repo)
2. Set root directory to `apps/web`
3. Add environment variables:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-url.railway.app/api
API_URL=https://your-api-url.railway.app/api
```

4. Railway will auto-detect Next.js and deploy

### 3. Free Vector Database

**Option A: Qdrant Cloud (Recommended)**
1. Visit: https://cloud.qdrant.io
2. Sign up for free tier (1GB storage)
3. Create cluster
4. Copy URL and API key to Railway

**Option B: Use Supabase Vector (pgvector)**
1. Visit: https://supabase.com
2. Create free project
3. Enable pgvector extension
4. Use PostgreSQL connection for vectors

### 4. Access Your Deployment

- **Frontend**: `https://your-web-app.railway.app`
- **API**: `https://your-api-app.railway.app`
- **Docs**: `https://your-api-app.railway.app/api/docs`

### 5. Share with Client

Send client:
- Frontend URL for testing
- Demo credentials (if needed)
- API documentation link

---

## Railway Free Limits
- $5/month credit (enough for small demos)
- 500 hours/month execution time
- 1GB RAM per service
- 1GB disk per service
- Custom domains included

## Cost Optimization
- Use sleep feature for unused services
- Minimize always-on services
- Use shared databases when possible