const fs = require('fs');
const path = require('path');

function walk(dir, exts, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.next' || entry.name.startsWith('.')) continue;
      walk(full, exts, found);
    }
    else if (exts.some(e => entry.name.endsWith(e))) found.push(full);
  }
  return found;
}

const files = walk('.', ['.ts', '.tsx', '.css', '.html', '.json', '.md', '.sql', '.cjs', '.js']);
let fixed = 0;
let summary = [];

for (const f of files) {
  const buf = fs.readFileSync(f);
  const out = Buffer.alloc(buf.length);
  let i = 0, j = 0, changes = 0;
  while (i < buf.length) {
    if (i + 3 < buf.length &&
        buf[i] === 0xC3 && buf[i+1] === 0x83 &&
        buf[i+2] === 0xC2 && buf[i+3] >= 0x80 && buf[i+3] <= 0xBF) {
      out[j++] = 0xC3;
      out[j++] = buf[i+3];
      i += 4;
      changes++;
    } else {
      out[j++] = buf[i++];
    }
  }
  if (changes > 0) {
    fs.writeFileSync(f, out.slice(0, j));
    summary.push(`${f}: ${changes}`);
    fixed++;
  }
}

console.log(`✅ Corrigidos: ${fixed} arquivos`);
summary.forEach(s => console.log('  ' + s));