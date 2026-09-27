const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');

// Remove existing dist if any and recreate it
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Items to include in the deployment bundle
const itemsToCopy = ['index.html', 'css', 'js'];

itemsToCopy.forEach(item => {
  const src = path.join(__dirname, item);
  const dest = path.join(distDir, item);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
});

console.log('✓ Build successful: Static assets copied to dist/');