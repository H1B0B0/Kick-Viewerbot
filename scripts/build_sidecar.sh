#!/bin/bash
set -e

# Target triple for Tauri sidecar
TARGET_TRIPLE=$(rustc -Vv | grep host | cut -f2 -d' ')
echo "Target triple: $TARGET_TRIPLE"

# Build backend using pyinstaller
echo "Building Python backend..."
pyinstaller KickViewerBOT-macOS.spec --noconfirm

# Create bin directory in tauri
mkdir -p frontend/src-tauri/bin

# Copy executable with the correct sidecar naming
echo "Copying to tauri sidecar..."
cp dist/KickViewerBOT frontend/src-tauri/bin/backend-$TARGET_TRIPLE

echo "Done!"
