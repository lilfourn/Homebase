#!/bin/bash

echo "Cleaning Next.js build artifacts..."

# Kill any running Next.js processes
pkill -f "next dev" || true

# Remove build directories
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc

# Clear Next.js cache
rm -rf ~/.next/cache

echo "Clean complete. You can now run 'npm run dev'"