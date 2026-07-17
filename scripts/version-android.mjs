#!/usr/bin/env node
import {readFileSync,writeFileSync} from 'node:fs';
const gradlePath='android/app/build.gradle';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
let gradle=readFileSync(gradlePath,'utf8');
const run=Number.parseInt(process.env.GITHUB_RUN_NUMBER||'',10);
const forced=Number.parseInt(process.env.N54_VERSION_CODE||'',10);
const versionCode=Number.isFinite(forced) ? forced : Number.isFinite(run) ? 11000+run : 11000;
const versionName=process.env.N54_VERSION_NAME||pkg.version||'1.1.0';
if(!/versionCode\s+\d+/.test(gradle)||!/versionName\s+"[^"]+"/.test(gradle)) throw new Error('Android version fields not found');
gradle=gradle.replace(/versionCode\s+\d+/,'versionCode '+versionCode);
gradle=gradle.replace(/versionName\s+"[^"]+"/,'versionName "'+versionName+'"');
writeFileSync(gradlePath,gradle);
writeFileSync('android/n54-version.txt',`versionCode=${versionCode}\nversionName=${versionName}\n`);
console.log(`✓ Android ${versionName} (${versionCode})`);
