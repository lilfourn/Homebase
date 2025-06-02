#!/bin/bash

# Convex Deployment Script
# Usage: ./scripts/deploy-convex.sh [--prod]

set -e

IS_PRODUCTION=false

# Check for production flag
if [ "$1" = "--prod" ]; then
    IS_PRODUCTION=true
fi

# Run type generation
echo "📝 Generating TypeScript types..."
npx convex codegen

# Deploy functions
if [ "$IS_PRODUCTION" = true ]; then
    echo "🚀 Deploying Convex to PRODUCTION..."
    echo "⚠️  You are about to deploy to PRODUCTION!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        npx convex deploy --prod
        echo "✅ Production deployment completed!"
    else
        echo "❌ Production deployment cancelled"
        exit 1
    fi
else
    echo "🚀 Deploying Convex to development..."
    npx convex deploy
    echo "✅ Development deployment completed!"
fi