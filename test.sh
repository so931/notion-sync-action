#!/bin/bash

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run TypeScript compiler
echo "Compiling TypeScript..."
npx tsc --noEmit

# Run tests
echo "Running tests..."
npx jest --passWithNoTests

echo "Test run complete!"