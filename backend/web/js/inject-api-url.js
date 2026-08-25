/**
 * Vercel build script: inject API_BASE_URL from env into portal/js/api-url.js
 * Set API_BASE_URL in Vercel Project Settings > Environment Variables (e.g. https://your-api.railway.app/api)
 */
const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.API_BASE_URL || '';
const outPath = path.join(__dirname, '..', 'portal', 'js', 'api-url.js');
const content = `// Injected at build time (Vercel). Leave empty for localhost.
window.API_BASE_URL = ${apiBaseUrl ? `'${apiBaseUrl.replace(/'/g, "\\'")}'` : "''"};
`;

fs.writeFileSync(outPath, content, 'utf8');
console.log('API URL injected:', apiBaseUrl || '(localhost)');
