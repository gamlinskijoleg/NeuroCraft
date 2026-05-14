#!/bin/bash

echo "Building Android APK locally..."
echo ""

cd "$(dirname "$0")"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build release APK
echo "Running gradlew assembleRelease..."
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Build successful!"
    echo "APK location: front-end/android/app/build/outputs/apk/release/app-release.apk"
else
    echo ""
    echo "✗ Build failed. Check error messages above."
    exit 1
fi
