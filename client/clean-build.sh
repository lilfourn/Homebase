#!/bin/bash

echo "🧹 Starting clean build process..."

# Step 1: Kill any running processes
echo "📍 Step 1: Stopping any running processes..."
lsof -ti:3000 -ti:3001 | xargs kill -9 2>/dev/null || true

# Step 2: Clean all caches
echo "📍 Step 2: Cleaning caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next.cache
rm -f yarn-error.log

# Step 3: Verify yarn.lock exists
echo "📍 Step 3: Verifying yarn.lock..."
if [ ! -f "yarn.lock" ]; then
    echo "❌ yarn.lock not found. Running yarn install..."
    yarn install
fi

# Step 4: Build the project
echo "📍 Step 4: Building project..."
yarn build

# Step 5: Start dev server
echo "📍 Step 5: Starting development server..."
yarn dev

echo "✅ Clean build complete!"