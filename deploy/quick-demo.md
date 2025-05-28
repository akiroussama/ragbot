# Quick Demo Deployment (30 minutes)

## Simplified Architecture for Demo

For client demos, simplify the stack:

### 1. Frontend-Only Demo (Fastest)

Deploy just the frontend with mock data:

**Create**: `apps/web/lib/demo-data.ts`
```typescript
// Mock API responses for demo
export const mockChatResponse = {
  message: "Based on your documents, I can help you with...",
  retrievedDocuments: [
    {
      id: "doc1",
      content: "Sample document content...",
      score: 0.95,
      metadata: { source: "sample.pdf" }
    }
  ]
};

export const mockDocuments = [
  {
    id: "doc1",
    fileName: "Product Guide.pdf",
    status: "completed",
    chunks: 25,
    createdAt: new Date().toISOString()
  }
];
```

**Deploy to Vercel**:
1. Push to GitHub
2. Import to Vercel
3. Set environment: `DEMO_MODE=true`
4. Live in 2 minutes!

### 2. Full Stack on Single Platform

**Use Render (Recommended for demos)**:

```bash
# 1. Create simplified docker-compose for production
# 2. Use Render's Docker deployment
# 3. Single URL for client testing
```

**render-demo.yaml**:
```yaml
services:
  - type: web
    name: chatbot-rag-demo
    env: docker
    plan: free
    repo: https://github.com/your-username/chatbot-rag
    dockerfilePath: ./deploy/Dockerfile.demo
    envVars:
      - key: OPENAI_API_KEY
        sync: false
      - key: DEMO_MODE
        value: "true"
```

### 3. Create Demo Dockerfile

**deploy/Dockerfile.demo**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN npm install

# Copy source
COPY apps/web ./apps/web
COPY packages ./packages

# Build
RUN npm run build:web

EXPOSE 3000

# Start with demo data
CMD ["npm", "run", "start:demo"]
```

### 4. Demo-Specific Features

**Enable demo mode** in your app:

```typescript
// apps/web/lib/demo.ts
export const isDemoMode = process.env.DEMO_MODE === 'true';

export function getDemoApiClient() {
  if (isDemoMode) {
    return {
      chat: () => Promise.resolve(mockChatResponse),
      documents: () => Promise.resolve(mockDocuments),
      // ... other mock endpoints
    };
  }
  return realApiClient;
}
```

### 5. Client Demo Setup

**Create demo script**:

```bash
#!/bin/bash
# deploy-demo.sh

echo "🚀 Deploying ChatBot RAG Demo..."

# 1. Build demo version
npm run build:demo

# 2. Deploy to Render
render deploy

# 3. Show client URL
echo "✅ Demo ready at: https://chatbot-rag-demo.onrender.com"
echo "📧 Share this URL with your client!"
```

---

## Client Sharing Package

Create a client package:

**client-demo/README.md**:
```markdown
# ChatBot RAG Demo

🔗 **Live Demo**: https://your-demo-url.com

## Test Features

1. **Chat Interface**
   - Type: "What documents do I have?"
   - Try: "Summarize the main topics"

2. **Document Upload**
   - Upload a PDF or Word document
   - Watch real-time processing

3. **Analytics Dashboard**
   - View usage metrics
   - See conversation insights

## Demo Credentials
- **Username**: demo@client.com
- **Password**: DemoPass123

## Technical Specs
- **Frontend**: Next.js 14 + TypeScript
- **Backend**: NestJS + PostgreSQL
- **AI**: OpenAI GPT + Vector Search
- **Deployment**: Containerized on Render

## Next Steps
- Custom domain setup
- Production scaling
- Enterprise features
- Custom integrations
```

## Quick Deploy Commands

```bash
# Option 1: Railway (Recommended)
git push origin main
# Deploy via Railway dashboard

# Option 2: Render
render-cli deploy

# Option 3: Vercel (Frontend only)
vercel --prod

# Option 4: Demo mode
npm run deploy:demo
```

---

## Total Cost: $0/month

All platforms offer generous free tiers perfect for client demos!