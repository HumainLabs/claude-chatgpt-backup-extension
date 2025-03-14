#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');
const { exec, execSync } = require('child_process');

// Clean dist directory
console.log('Cleaning dist directory...');
fs.removeSync('dist');
fs.mkdirSync('dist');

// Create extension structure
console.log('Creating extension directory structure...');
fs.mkdirSync('dist/ui', { recursive: true });
fs.mkdirSync('dist/html', { recursive: true });
fs.mkdirSync('dist/icons', { recursive: true });

// Compile TypeScript files one by one with explicit options to ensure browser compatibility
console.log('Compiling background script...');
try {
  execSync('npx tsc src/chat_export_background.ts --target es2020 --moduleResolution node --outDir dist --module none', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to compile background script:', error.message);
}

console.log('Compiling popup script...');
try {
  fs.mkdirSync('dist/ui', { recursive: true });
  execSync('npx tsc src/ui/chat_export_popup.ts --target es2020 --moduleResolution node --outDir dist/ui --module none', { stdio: 'inherit' });
} catch (error) {
  console.error('Failed to compile popup script:', error.message);
}

// Copy HTML files
console.log('Copying HTML files...');
fs.copySync('src/html', 'dist/html');

// Copy manifest.json
console.log('Copying manifest.json...');
fs.copySync('src/manifest.json', 'dist/manifest.json');

// Handle icon files
console.log('Copying icon files...');
fs.mkdirSync('dist/icons', { recursive: true });

// Copy icon files from src/icons if they exist
if (fs.existsSync('src/icons')) {
  fs.copySync('src/icons', 'dist/icons');
}

// Check if custom logo exists and use it for icons
if (fs.existsSync('humainlabs.ai.png')) {
  console.log('Using HumainLabs.ai logo for icons...');
  fs.copySync('humainlabs.ai.png', 'dist/icons/icon48.png');
  fs.copySync('humainlabs.ai.png', 'dist/icons/icon96.png');
} else {
  console.log('HumainLabs.ai logo not found, using placeholder icons...');
  // Create placeholder icons if they don't exist
  if (!fs.existsSync('dist/icons/icon48.png')) {
    fs.writeFileSync('dist/icons/icon48.png', '');
  }
  
  if (!fs.existsSync('dist/icons/icon96.png')) {
    fs.writeFileSync('dist/icons/icon96.png', '');
  }
}

console.log('Build completed! Load the extension from the dist directory in Firefox.'); 