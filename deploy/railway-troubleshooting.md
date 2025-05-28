# 🔧 Railway Deployment Troubleshooting

## Common Issues & Solutions

### 1. Build Failures

**Issue**: "Build failed" or "Command not found"

**Solutions**:

#### Fix Package.json Scripts
Update your root `package.json`:

```json
{
  "scripts": {
    "build": "turbo build",
    "build:api": "cd apps/api && npm run build",
    "build:web": "cd apps/web && npm run build",
    "start": "cd apps/api && npm start",
    "start:api": "cd apps/api && npm start",
    "start:web": "cd apps/web && npm start"
  }
}
```

#### Create Railway-specific start command
Create `apps/api/package.json` with:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "start:prod": "node dist/main.js"
  }
}
```

### 2. Monorepo Issues

**Issue**: Railway can't find the right app to build

**Solution A: Split Deployments**

1. Deploy API separately:
   - Create new Railway service
   - Set **Root Directory**: `apps/api`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start:prod`

2. Deploy Web separately:
   - Create another Railway service
   - Set **Root Directory**: `apps/web`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

**Solution B: Create Simplified Structure**

Create deployment-specific files:

**railway-api.json** (for API deployment):
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd apps/api && npm start",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### 3. Environment Variable Issues

**Issue**: App crashes with "Missing environment variables"

**Required Variables for Railway**:

```bash
# Essential
NODE_ENV=production
PORT=3000

# Database (Railway provides these automatically)
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# AI Provider (YOU MUST SET)
OPENAI_API_KEY=sk-your-actual-key-here

# Security (generate random strings)
JWT_SECRET=your-random-string-32-chars-long
JWT_REFRESH_SECRET=another-random-string-32-chars

# Optional but recommended
CHAT_DEFAULT_PROVIDER=openai
CHAT_DEFAULT_MODEL=gpt-3.5-turbo
ENABLE_RETRIEVAL=false
ENABLE_WEBHOOKS=false
```

### 4. Memory/Timeout Issues

**Issue**: Build times out or runs out of memory

**Solutions**:

#### Optimize package.json
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  },
  "scripts": {
    "build": "npm ci --only=production && npm run build:api",
    "start": "node apps/api/dist/main.js"
  }
}
```

#### Create .railwayignore
```bash
# .railwayignore
node_modules
.git
*.log
dist
.next
.turbo
docker-compose.yml
Dockerfile*
*.md
docs/
tests/
__tests__/
*.test.ts
*.spec.ts
```

### 5. Quick Fix: Single-App Deployment

Create a simplified version for Railway:

#### Create standalone API

**Create**: `railway-api/package.json`
```json
{
  "name": "chatbot-rag-api",
  "version": "1.0.0",
  "main": "dist/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/main.js",
    "dev": "nest start --watch"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

#### Copy essential files
```bash
cp -r apps/api/src railway-api/src
cp apps/api/tsconfig.json railway-api/
```

#### Deploy single app
1. Push `railway-api` folder to separate repo
2. Deploy that repo on Railway
3. Much simpler, fewer dependencies!

### 6. Step-by-Step Railway Fix

**Method 1: Fresh Deployment**

1. **Create new Railway project**
2. **Add PostgreSQL first**:
   ```
   + New → Database → PostgreSQL
   ```
3. **Add Redis**:
   ```
   + New → Database → Redis
   ```
4. **Add your app**:
   ```
   + New → GitHub Repo → Select your repo
   ```
5. **Configure in Railway dashboard**:
   - **Root Directory**: Leave blank OR set to `apps/api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

**Method 2: Use Railway CLI**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy from specific directory
cd apps/api
railway deploy
```

### 7. Alternative: Deploy Frontend Only

If API is too complex, deploy just the frontend with demo data:

1. **Deploy `apps/web` to Vercel**:
   ```bash
   cd apps/web
   npx vercel --prod
   ```

2. **Add demo mode**:
   ```bash
   # Environment variable in Vercel
   DEMO_MODE=true
   ```

3. **Share Vercel URL** with client for UI demo

### 8. Error-Specific Solutions

**"Module not found"**:
- Check all imports use relative paths
- Verify package.json dependencies
- Remove monorepo workspace references

**"Port already in use"**:
- Set `PORT` environment variable
- Use `process.env.PORT || 3000` in your code

**"Database connection failed"**:
- Verify `DATABASE_URL` is set
- Check PostgreSQL service is running
- Use Railway's provided connection string

**"Build exceeds time limit"**:
- Remove unnecessary dependencies
- Use `.railwayignore` to exclude files
- Consider deploying smaller chunks

---

## 🚀 Quick Success Recipe

1. **Simplify first**: Deploy just the API with minimal features
2. **Use Railway templates**: Look for NestJS templates
3. **Check logs**: Railway dashboard shows detailed error logs
4. **Start small**: Get basic API working, then add features
5. **Use Railway Discord**: Great community support

## 📞 Need More Help?

Share the specific error message you're seeing, and I can provide targeted solutions!