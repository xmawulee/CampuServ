const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getRelativePath(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel.replace(/\.tsx?$/, '');
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      if (fullPath.includes('CustomIcons.tsx') || fullPath.includes('categoryIcons.tsx')) continue;

      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes("from '@expo/vector-icons'")) {
        const customIconsPath = path.join(srcDir, 'components', 'CustomIcons.tsx');
        const relPath = getRelativePath(fullPath, customIconsPath);
        
        content = content.replace(/import\s+\{\s*Ionicons\s*\}\s+from\s+['"]@expo\/vector-icons['"];?/g, `import { CustomIonicons as Ionicons } from '${relPath}';`);
        
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(srcDir);
console.log('Refactor complete.');
