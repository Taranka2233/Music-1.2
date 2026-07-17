#!/usr/bin/env node
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const manifestPath='android/app/src/main/AndroidManifest.xml';
if(!existsSync(manifestPath))throw new Error('Android manifest missing');
let xml=readFileSync(manifestPath,'utf8');
const service=/<service\s+android:name="\.N54PlaybackService"[\s\S]*?<\/service>/;
const match=xml.match(service);
if(!match)throw new Error('N54PlaybackService declaration missing');
xml=xml.replace(service,match[0].replace('android:exported="true"','android:exported="false"'));
writeFileSync(manifestPath,xml);
const finalBlock=readFileSync(manifestPath,'utf8').match(service)?.[0]||'';
if(!finalBlock.includes('android:exported="false"'))throw new Error('Media3 pilot must remain private');

const cfg=JSON.parse(readFileSync('capacitor.config.json','utf8'));
const javaPath='android/app/src/main/java/'+cfg.appId.replaceAll('.','/')+'/N54Media3Plugin.java';
if(!existsSync(javaPath))throw new Error('Generated N54Media3Plugin.java missing');
let java=readFileSync(javaPath,'utf8');
const oldContent='Uri.parse("content:" + path.substring(CONTENT_PROXY.length()))';
const newContent='Uri.parse("content://" + path.substring(CONTENT_PROXY.length()).replaceFirst("^/+", ""))';
const oldFile='Uri.parse("file://" + path.substring(FILE_PROXY.length()))';
const newFile='Uri.parse("file:///" + path.substring(FILE_PROXY.length()).replaceFirst("^/+", ""))';
java=java.replace(oldContent,newContent).replace(oldFile,newFile);
writeFileSync(javaPath,java);
const fixed=readFileSync(javaPath,'utf8');
if(!fixed.includes(newContent)||!fixed.includes(newFile))throw new Error('Media3 proxy URI fix missing');
console.log('✓ Media3 private pilot v2: native-safe proxy URIs');
