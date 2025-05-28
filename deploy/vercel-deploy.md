# Deploy to Vercel + PlanetScale (FREE)

## Setup (15 minutes)

### 1. Deploy Frontend to Vercel

**Visit**: https://vercel.com

1. Import your GitHub repository
2. Set framework preset: **Next.js**
3. Set root directory: `apps/web`
4. Add environment variables:

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api.vercel.app/api
API_URL=https://your-api.vercel.app/api
```

5. Deploy! Your frontend will be live at: `https://your-app.vercel.app`

### 2. Deploy API to Vercel (Serverless)

Create API-specific configuration:

**vercel.json** (in `/apps/api/`):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/main.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/main.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Note**: Vercel has 10s timeout for serverless functions, so some features may need adjustment.

### 3. Database Setup

**PlanetScale (MySQL)** - Free tier:
1. Visit: https://planetscale.com
2. Create free database
3. Get connection string
4. Add to Vercel environment

**Alternative: Neon (PostgreSQL)**:
1. Visit: https://neon.tech
2. Create free PostgreSQL database
3. 3GB storage free

### 4. Redis Alternative

Since Redis isn't available free on Vercel:

**Option A: Upstash Redis**
1. Visit: https://upstash.com
2. Create free Redis database
3. 10K commands/day free

**Option B: Use Database for Sessions**
- Store sessions in PostgreSQL
- Use in-memory cache for development

### 5. Vector Database

**Qdrant Cloud**: https://cloud.qdrant.io
- 1GB free tier
- Perfect for demos

### 6. Simplified Deployment

For quickest deployment, create a simplified version:

**apps/api/vercel-main.js**:
```javascript
// Simplified API for Vercel deployment
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await NestFactory.create(AppModule);
    await app.init();
  }
  
  return app.getHttpAdapter().getInstance()(req, res);
}
```

---

## Free Limits
- **Vercel**: 100GB bandwidth, 1000 serverless invocations
- **PlanetScale**: 1 database, 1GB storage, 1 billion row reads
- **Upstash**: 10K Redis commands/day
- **Qdrant Cloud**: 1GB vector storage