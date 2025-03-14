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

// Create icons if they don't exist
console.log('Handling icon files...');
fs.mkdirSync('icons', { recursive: true });

const icon48Path = 'icons/icon48.png';
const icon96Path = 'icons/icon96.png';

// Create placeholder icon files if they don't exist
if (!fs.existsSync(icon48Path)) {
  fs.writeFileSync(icon48Path, '');
}

if (!fs.existsSync(icon96Path)) {
  fs.writeFileSync(icon96Path, '');
}

// Copy icons to the dist directory
fs.copySync('icons', 'dist/icons');

console.log('Build completed! Load the extension from the dist directory in Firefox.'); 