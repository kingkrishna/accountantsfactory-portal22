const fs = require('fs');
const path = require('path');

const portalDir = path.join(__dirname, '../../web/portal');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.html')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const newContent = content.replace(/\?v=\d+/g, '?v=100');
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Bumped cache in ${fullPath}`);
      }
    }
  }
}

processDir(portalDir);
