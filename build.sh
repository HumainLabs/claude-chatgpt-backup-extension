#!/bin/bash

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Build the extension
npm run build

# Create direct directory structure for extension
mkdir -p dist/ui

# Copy the background script to root of dist if it's not there
if [ ! -f "dist/chat_export_background.js" ] && [ -f "dist/src/chat_export_background.js" ]; then
  cp dist/src/chat_export_background.js dist/
fi

# Copy the popup script to ui directory if it's not there
if [ ! -f "dist/ui/chat_export_popup.js" ] && [ -f "dist/src/ui/chat_export_popup.js" ]; then
  cp dist/src/ui/chat_export_popup.js dist/ui/
fi

echo "Build completed! Extension files are in the dist directory."
echo "Load the extension from the dist directory in Firefox Developer Edition."
echo "You can run 'npm run start' to test the extension directly in Firefox." 