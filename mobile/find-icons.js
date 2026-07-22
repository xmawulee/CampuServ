const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const iconNames = new Set();

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /<Ionicons\s+name=["']([^"']+)["']/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        iconNames.add(match[1]);
      }
      
      const customRegex = /<CustomIonicons\s+name=["']([^"']+)["']/g;
      while ((match = customRegex.exec(content)) !== null) {
        iconNames.add(match[1]);
      }
    }
  }
}

processDir(srcDir);
console.log('Icons found:', Array.from(iconNames));
