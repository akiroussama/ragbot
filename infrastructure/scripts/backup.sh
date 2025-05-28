#!/bin/bash

set -e

# Configuration
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ENVIRONMENT=${ENVIRONMENT:-production}

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🔄 Starting backup for environment: $ENVIRONMENT"

# Backup PostgreSQL
echo "🗄️  Backing up PostgreSQL..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump \
    -h $DATABASE_HOST \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    --no-owner \
    --no-privileges \
    -f "$BACKUP_DIR/postgres_${ENVIRONMENT}_${TIMESTAMP}.sql"

# Compress PostgreSQL backup
gzip "$BACKUP_DIR/postgres_${ENVIRONMENT}_${TIMESTAMP}.sql"

# Backup Redis
echo "💾 Backing up Redis..."
redis-cli -h $REDIS_HOST -a $REDIS_PASSWORD --rdb "$BACKUP_DIR/redis_${ENVIRONMENT}_${TIMESTAMP}.rdb"

# Backup Qdrant
echo "🔍 Backing up Qdrant..."
curl -X POST "$QDRANT_URL/snapshots" \
    -H "Api-Key: $QDRANT_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"backup_${ENVIRONMENT}_${TIMESTAMP}\"}"

# Upload to S3
if [ -n "$AWS_S3_BACKUP_BUCKET" ]; then
    echo "☁️  Uploading backups to S3..."
    aws s3 cp "$BACKUP_DIR/postgres_${ENVIRONMENT}_${TIMESTAMP}.sql.gz" \
        "s3://$AWS_S3_BACKUP_BUCKET/postgres/"
    
    aws s3 cp "$BACKUP_DIR/redis_${ENVIRONMENT}_${TIMESTAMP}.rdb" \
        "s3://$AWS_S3_BACKUP_BUCKET/redis/"
fi

# Clean up old local backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "✅ Backup completed successfully!"

# Send notification
if [ -n "$SLACK_WEBHOOK_URL" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{\"text\":\"✅ Backup completed for $ENVIRONMENT environment\"}" \
        "$SLACK_WEBHOOK_URL"
fi