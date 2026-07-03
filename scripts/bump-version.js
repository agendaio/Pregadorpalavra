#!/usr/bin/env node
/**
 * bump-version.js — Incremeta o patch da versão no package.json.
 * Uso: node scripts/bump-version.js
 *
 * Rodar ANTES do build pra versionar o deploy corretamente.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

// Parseia "major.minor.patch"
const [major, minor, patch] = pkg.version.split('.').map(Number);
const newPatch = (patch || 0) + 1;
const newVersion = `${major}.${minor}.${newPatch}`;

pkg.version = newVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`\u2705 Versão bumpada: ${pkg.version} → ${newVersion}\n`);
