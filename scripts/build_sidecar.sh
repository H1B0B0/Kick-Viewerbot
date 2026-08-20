#!/bin/bash
set -e

# Change to project root
cd "$(dirname "$0")/.."

# Target triple for Tauri sidecar
TARGET_TRIPLE=$(rustc -Vv | grep host | cut -f2 -d' ')
echo "Target triple: $TARGET_TRIPLE"

# Ensure venv exists and activate
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Ensure pyinstaller is installed
if ! command -v pyinstaller &> /dev/null; then
    echo "Installing pyinstaller..."
    pip install pyinstaller
fi

# Build backend using pyinstaller
echo "Building Python backend..."
pyinstaller KickViewerBOT-macOS.spec --noconfirm

# Create bin directory in tauri
mkdir -p frontend/src-tauri/bin

# Copy executable with the correct sidecar naming
echo "Copying to tauri sidecar..."
cp dist/KickViewerBOT frontend/src-tauri/bin/backend-$TARGET_TRIPLE

echo "Build complete! Sidecar is ready at frontend/src-tauri/bin/backend-$TARGET_TRIPLE"
chmod +x frontend/src-tauri/bin/backend-$TARGET_TRIPLE
