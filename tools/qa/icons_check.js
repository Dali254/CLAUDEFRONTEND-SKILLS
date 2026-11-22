// every icon name used in kit demos, backend views and modules exists in kit/sunrise-icons.js (names or aliases); every ph-* class exists in the Phosphor CSS
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(root, 'kit/sunrise-icons.js'), 'utf8');
const obj = n => JSON.parse(src.match(new RegExp('var ' + n + ' = (\\{.*?\\});\\n'))[1]);
const F = obj('F'), A = obj('A'), P = obj('P');
const known = n => F[n] || (A[n] && (F[A[n]] || P.lucide[A[n]])) || P.lucide[n];
const ph = fs.readFileSync(path.join(root, 'kit/vendor/phosphor/phosphor.css'), 'utf8');
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/node_modules|vendor|\.git|screenshots|dist/.test(f.name)) walk(p); } else if (/\.(php|html|js)$/.test(f.name) && !/sunrise-icons\.js$/.test(f.name)) files.push(p); } })(root);
const bad = new Set();
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8'), rel = path.relative(root, f);
  for (const m of t.matchAll(/(?:data-icon="|icon\(\s*'|'icon'\s*=>\s*')([a-z][a-z0-9-]*)/g)) if (!known(m[1])) bad.add(rel + ': unknown icon "' + m[1] + '"');
  for (const m of t.matchAll(/\bph ph-([a-z0-9-]+)/g)) if (!ph.includes('.ph-' + m[1] + ':')) bad.add(rel + ': unknown Phosphor icon "ph-' + m[1] + '"');
}
for (const b of bad) console.log('  FAIL ' + b);
console.log('icons: ' + (bad.size ? bad.size + ' unknown' : 'all known') + ' (' + files.length + ' files)');
process.exit(bad.size ? 1 : 0);
