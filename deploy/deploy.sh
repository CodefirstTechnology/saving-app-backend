#!/bin/bash
set -e

echo "🚀 Starting Bachat Pragati Backend Deployment..."

# 1. Pull latest code (if using git)
# git pull origin main

# 2. Go to deployment directory
cd "$(dirname "$0")"

# 3. Pull/rebuild and start containers
echo "📦 Building and starting Docker containers..."
docker compose down
docker compose up -d --build

# 4. Check status
echo "🔍 Checking container status..."
docker compose ps

echo "✅ Deployment completed successfully!"
echo "👉 Check logs anytime with: docker compose logs -f"
