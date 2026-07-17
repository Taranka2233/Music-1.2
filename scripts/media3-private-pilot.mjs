#!/usr/bin/env node
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const path='android/app/src/main/AndroidManifest.xml';
if(!existsSync(path))throw new Error('Android manifest missing');
let xml=readFileSync(path,'utf8');
const service=/<service\s+android:name="\.N54PlaybackService"[\s\S]*?<\/service>/;
const match=xml.match(service);
if(!match)throw new Error('N54PlaybackService declaration missing');
let block=match[0].replace('android:exported="true"','android:exported="false"');
xml=xml.replace(service,block);
writeFileSync(path,xml);
const finalBlock=readFileSync(path,'utf8').match(service)?.[0]||'';
if(!finalBlock.includes('android:exported="false"'))throw new Error('Media3 pilot must remain private');
console.log('✓ Media3 pilot service is private to N54');
