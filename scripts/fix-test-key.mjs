import { readFileSync, writeFileSync } from 'fs';
const path = 'C:\\Users\\Solai Brasil\\Documents\\dev\\ESBOÇO PREGADOR\\supabase\\functions\\test-key\\index.ts';
let content = readFileSync(path, 'utf-8');
const lines = content.split('\n');
lines[135] = '        const parsed = err ? JSON.parse(err) : {};';
writeFileSync(path, lines.join('\n'), 'utf-8');
console.log('✅ Line 136 fixed!');
console.log('New line:', lines[135]);
