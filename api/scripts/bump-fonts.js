const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, '../web/portal/css');
const files = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));

files.forEach(file => {
  const filePath = path.join(cssDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Bump 11px, 12px, 13px, 14px, 15px
  content = content.replace(/font-size:\s*(1[1-5])px/g, (match, p1) => {
    const newSize = parseInt(p1, 10) + 2;
    return `font-size: ${newSize}px`;
  });
  
  // Optionally bump rem values if needed, but the complaint is likely about px sizes
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Bumped fonts in ${file}`);
});
