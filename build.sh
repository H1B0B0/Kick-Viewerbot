#!/bin/bash

set -e  # Exit on error

echo "=== Starting build process ==="

# Build Next.js app
echo "Building Next.js app..."
cd frontend
npm run build

echo "=== Preparing static files ==="
# Clean and create static directory
rm -rf ../backend/static
mkdir -p ../backend/static

# Copy the exported Next.js app to Flask static directory
echo "Copying files to static directory..."
cp -rv out/* ../backend/static/

# Ensure proper permissions
echo "Setting permissions..."
chmod -R 755 ../backend/static
find ../backend/static -type f -exec chmod 644 {} \;
find ../backend/static -type d -exec chmod 755 {} \;

# Verify the copy
echo "=== Verifying static files ==="
if [ ! -f "../backend/static/index.html" ]; then
    echo "ERROR: index.html not found in static directory!"
    exit 1
fi

echo "Contents of static directory:"
ls -la ../backend/static

echo "=== Build complete ==="
