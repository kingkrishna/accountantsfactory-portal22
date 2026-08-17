const fs = require('fs');
const path = require('path');

const portalRoot = 'web/portal';

function getAllHtml(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) results = results.concat(getAllHtml(full));
    else if (f.endsWith('.html')) results.push(full);
  }
  return results;
}

const pages = getAllHtml(portalRoot);
console.log('=== CHECKING ALL ' + pages.length + ' HTML PAGES ===\n');

pages.forEach(function(pg) {
  const rel = pg.replace('web\\portal\\', '').replace('web/portal/', '');
  const html = fs.readFileSync(pg, 'utf8');
  const pageIssues = [];

  // 1. Check CSS links resolve correctly
  const cssRegex = /href="([^"]+\.css[^"]*)"/g;
  let m;
  while ((m = cssRegex.exec(html)) !== null) {
    const link = m[1].split('?')[0];
    if (link.startsWith('http')) continue;
    const absPath = path.resolve(path.dirname(pg), link);
    if (!fs.existsSync(absPath)) pageIssues.push('MISSING CSS: ' + link);
  }

  // 2. Check JS scripts resolve correctly
  const jsRegex = /src="([^"]+\.js[^"]*)"/g;
  while ((m = jsRegex.exec(html)) !== null) {
    const s = m[1].split('?')[0];
    if (s.startsWith('http')) continue;
    const absPath = path.resolve(path.dirname(pg), s);
    if (!fs.existsSync(absPath)) pageIssues.push('MISSING JS: ' + s);
  }

  // 3. Check images referenced directly in HTML
  const imgRegex = /src="([^"]+\.(png|jpg|jpeg|svg|gif|webp)[^"]*)"/g;
  while ((m = imgRegex.exec(html)) !== null) {
    const s = m[1].split('?')[0];
    if (s.startsWith('http')) continue;
    if (s.startsWith('/')) {
      // absolute path — resolve from web root
      const absPath = path.resolve('web' + s);
      if (!fs.existsSync(absPath)) pageIssues.push('MISSING IMG (absolute): ' + s);
    } else {
      const absPath = path.resolve(path.dirname(pg), s);
      if (!fs.existsSync(absPath)) pageIssues.push('MISSING IMG (relative): ' + s);
    }
  }

  // 4. Docgen has its own CSS system - skip portal checks for it
  const isDocgen = rel.includes('docgen');

  if (!isDocgen) {
    if (!html.includes('portal.css')) pageIssues.push('MISSING portal.css link');
    if (!html.includes('style-v2.css')) pageIssues.push('MISSING style-v2.css link');
    if (!html.includes('bootstrap')) pageIssues.push('MISSING Bootstrap CSS');
    if (!html.includes('fontawesome') && !html.includes('all.css')) pageIssues.push('MISSING FontAwesome');
    if (!html.includes('cache-buster.js')) pageIssues.push('MISSING cache-buster.js');
    if (!html.includes('api-url.js')) pageIssues.push('MISSING api-url.js');
    if (!html.includes('auth.js')) pageIssues.push('MISSING auth.js');
    if (!html.includes('api.js')) pageIssues.push('MISSING api.js');
  } else {
    // Docgen must have its own styles.css
    if (!html.includes('styles.css')) pageIssues.push('MISSING docgen styles.css');
    if (!html.includes('cache-buster.js')) pageIssues.push('MISSING cache-buster.js');
  }

  if (pageIssues.length === 0) {
    console.log('OK      ' + rel);
  } else {
    console.log('ISSUES  ' + rel);
    pageIssues.forEach(function(i) { console.log('        -> ' + i); });
  }
});
