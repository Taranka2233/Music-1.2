#!/usr/bin/env node
/** Загружает ровно проверенную версию YAMNet перед Android-сборкой. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

const URL = 'https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite';
const TARGET = 'native/ai/yamnet.tflite';
const TEMP = TARGET + '.download';
const EXPECTED = '4d8b4a53282dc83ef04e3e7dbc4fbc98082e34e44ed798e16c3a0cdd4c584faf';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

if (existsSync(TARGET)) {
  const actual = digest(readFileSync(TARGET));
  if (actual === EXPECTED) {
    console.log('YAMNet уже на месте // SHA-256 OK');
    process.exit(0);
  }
  console.warn(`YAMNet повреждён (${actual}) // загружаю заново`);
}

mkdirSync('native/ai', { recursive: true });
const response = await fetch(URL, { redirect:'follow' });
if (!response.ok) throw new Error(`YAMNet download: HTTP ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const actual = digest(bytes);
if (actual !== EXPECTED) {
  if (existsSync(TEMP)) unlinkSync(TEMP);
  throw new Error(`YAMNet SHA-256 mismatch: ${actual}`);
}
writeFileSync(TEMP, bytes);
renameSync(TEMP, TARGET);
console.log(`YAMNet → ${TARGET} // ${(bytes.length/1048576).toFixed(1)} МБ // SHA-256 OK`);
