#!/usr/bin/env node
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const manifestPath='android/app/src/main/AndroidManifest.xml';
if(!existsSync(manifestPath))throw new Error('Android manifest missing');
let xml=readFileSync(manifestPath,'utf8');
const service=/<service\s+android:name="\.N54PlaybackService"[\s\S]*?<\/service>/;
const match=xml.match(service);
if(!match)throw new Error('N54PlaybackService declaration missing');
const block=match[0].replace('android:exported="true"','android:exported="false"');
xml=xml.replace(service,block);
writeFileSync(manifestPath,xml);
const finalBlock=readFileSync(manifestPath,'utf8').match(service)?.[0]||'';
if(!finalBlock.includes('android:exported="false"'))throw new Error('Media3 pilot must remain private');

const cfg=JSON.parse(readFileSync('capacitor.config.json','utf8'));
const javaPath='android/app/src/main/java/'+cfg.appId.replaceAll('.','/')+'/N54Media3Plugin.java';
if(!existsSync(javaPath))throw new Error('Generated N54Media3Plugin.java missing');
let java=readFileSync(javaPath,'utf8');
java=java.replace('Uri.parse("content:" + path.substring(CONTENT_PROXY.length()))','Uri.parse("content://" + path.substring(CONTENT_PROXY.length()))');
java=java.replace('Uri.parse("file://" + path.substring(FILE_PROXY.length()))','Uri.parse("file:///" + path.substring(FILE_PROXY.length()))');
writeFileSync(javaPath,java);
const fixed=readFileSync(javaPath,'utf8');
if(!fixed.includes('Uri.parse("content://" + path.substring(CONTENT_PROXY.length()))'))throw new Error('Media3 content URI proxy fix missing');
if(!fixed.includes('Uri.parse("file:///" + path.substring(FILE_PROXY.length()))'))throw new Error('Media3 file URI proxy fix missing');
console.log('✓ Media3 pilot is private and proxy URIs are native-safe');
