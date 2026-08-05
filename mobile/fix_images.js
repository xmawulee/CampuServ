const fs = require('fs');
const path = require('path');

// 1x1 transparent PNG hex representation (completely valid PNG bytes)
const pngHex = '89504e470d0a1a0a0000000d49484452000000010000000108060000001f1563340000000b49444154789c636000000002000148afa4710000000049454e44ae426082';
const pngBuffer = Buffer.from(pngHex, 'hex');

const files = [
  'assets/images/bg_tile@4x.png',
  'assets/images/home/design_print.png',
  'assets/images/home/cleaning.png'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    // Backup the original JPEG disguised as a PNG
    const backupPath = filePath.replace(/\.png$/, '.jpg');
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backed up original JPEG to: ${backupPath}`);
    
    // Write the valid 1x1 PNG to the original path
    fs.writeFileSync(filePath, pngBuffer);
    console.log(`Replaced ${file} with valid 1x1 PNG.`);
  } else {
    console.log(`Warning: file not found at ${filePath}`);
  }
});

console.log("Fix completed successfully!");
