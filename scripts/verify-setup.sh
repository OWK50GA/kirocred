#!/bin/bash

# Kirocred Setup Verification Script
# This script verifies that all dependencies and tools are properly installed

set -e

echo "🔍 Verifying Kirocred Setup..."
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
node --version || { echo "❌ Node.js not found. Please install Node.js >= 18"; exit 1; }

# Check npm
echo "✓ Checking npm..."
npm --version || { echo "❌ npm not found. Please install npm >= 9"; exit 1; }

# Check Scarb
echo "✓ Checking Scarb..."
scarb --version || { echo "❌ Scarb not found. Install from: https://docs.swmansion.com/scarb/download.html"; exit 1; }

# Check Starknet Foundry
echo "✓ Checking Starknet Foundry..."
snforge --version || { echo "❌ snforge not found. Install from: https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html"; exit 1; }

# Check if dependencies are installed
echo "✓ Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed. Run: npm install"
    exit 1
fi

# Verify TypeScript configurations
echo "✓ Checking TypeScript configurations..."
[ -f "packages/backend/tsconfig.json" ] || { echo "❌ Backend tsconfig.json missing"; exit 1; }
[ -f "packages/frontend/tsconfig.json" ] || { echo "❌ Frontend tsconfig.json missing"; exit 1; }

# Verify Jest configurations
echo "✓ Checking Jest configurations..."
[ -f "packages/backend/jest.config.js" ] || { echo "❌ Backend jest.config.js missing"; exit 1; }
[ -f "packages/frontend/jest.config.js" ] || { echo "❌ Frontend jest.config.js missing"; exit 1; }

# Verify Scarb configuration
echo "✓ Checking Scarb configuration..."
[ -f "packages/contracts/Scarb.toml" ] || { echo "❌ Scarb.toml missing"; exit 1; }

# Check environment files
echo "✓ Checking environment files..."
if [ ! -f "packages/backend/.env" ]; then
    echo "⚠️  Backend .env not found. Copy from .env.example"
fi
if [ ! -f "packages/frontend/.env" ]; then
    echo "⚠️  Frontend .env not found. Copy from .env.example"
fi

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Configure environment variables (see .env.example files)"
echo "  2. Run tests: npm test"
echo "  3. Build project: npm run build"
echo "  4. Start development: npm run dev:backend (or dev:frontend)"
