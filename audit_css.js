const fs = require('fs');

const liveCSS = fs.readFileSync('web/css/style-v2.css', 'utf8');
const portalCSS = fs.readFileSync('web/portal/css/portal.css', 'utf8');

function extractRootVariables(cssString) {
  const rootMatch = cssString.match(/:root\s*\{([^}]+)\}/);
  if (!rootMatch) return {};
  
  const vars = {};
  const lines = rootMatch[1].split('\n');
  lines.forEach(line => {
    const match = line.match(/(--[^:]+):\s*([^;]+);/);
    if (match) {
      vars[match[1].trim()] = match[2].trim();
    }
  });
  return vars;
}

const liveVars = extractRootVariables(liveCSS);
const portalVars = extractRootVariables(portalCSS);

console.log('=== CSS VARIABLES AUDIT ===\n');

const allKeys = new Set([...Object.keys(liveVars), ...Object.keys(portalVars)]);
let mismatches = 0;

allKeys.forEach(key => {
  const liveVal = liveVars[key];
  const portalVal = portalVars[key];
  
  if (liveVal && portalVal && liveVal !== portalVal) {
    console.log('[MISMATCH] ' + key + ':');
    console.log('   Live   : ' + liveVal);
    console.log('   Portal : ' + portalVal);
    mismatches++;
  }
});

if (mismatches === 0) {
  console.log('ALL shared CSS variables match perfectly between Live and Portal.');
} else {
  console.log('\nFound ' + mismatches + ' mismatches that need fixing.');
}
