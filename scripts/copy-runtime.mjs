#!/usr/bin/env node
import { copyFileSync, existsSync, readFileSync } from 'node:fs';

const source = 'node_modules/@capacitor/core/dist/capacitor.js';
const target = 'www/capacitor.js';

if (!existsSync(source)) {
  console.error('Нет @capacitor/core. Сначала выполни npm ci.');
  process.exit(1);
}

copyFileSync(source, target);
const runtime = readFileSync(target, 'utf8');
const missing = ['registerPlugin', 'isNativePlatform', 'convertFileSrc'].filter(x => !runtime.includes(x));
if (missing.length) {
  console.error('Рантайм Capacitor неполный: ' + missing.join(', '));
  process.exit(1);
}

console.log('Рантайм Capacitor → www/capacitor.js');
