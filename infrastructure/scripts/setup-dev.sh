#!/bin/bash

set -e

echo "🚀 Setting up Chatbot RAG development environment..."

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting." >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "❌ pnpm is required but not installed. Aborting." >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

# Copy environment file
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual values"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis qdrant mailhog

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm --filter @chatbot-rag/database db:generate
pnpm --filter @chatbot-rag/database db:migrate

# Seed database
echo "🌱 Seeding database..."
pnpm --filter @chatbot-rag/database db:seed

# Build packages
echo "🔨 Building packages..."
pnpm --filter './packages/*' build

# Initialize Qdrant collections
echo "🔍 Initializing vector database..."
node infrastructure/scripts/init-qdrant.js

echo "✅ Development environment setup complete!"
echo ""
echo "📚 Next steps:"
echo "1. Update .env with your API keys and configuration"
echo "2. Run 'pnpm dev' to start all services"
echo "3. Access the services:"
echo "   - API: http://localhost:3000/api/v1"
echo "   - API Docs: http://localhost:3000/api/v1/docs"
echo "   - Admin Panel: http://localhost:3001"
echo "   - Widget Demo: http://localhost:3002"
echo "   - MailHog: http://localhost:8025"
echo "   - pgAdmin: http://localhost:5050 (admin@chatbot.com / admin123)"