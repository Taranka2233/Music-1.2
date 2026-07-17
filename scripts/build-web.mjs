#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync} from 'node:fs';
import {dirname, join} from 'node:path';

const sourceDir='www';
const outputDir=process.argv[2]||process.env.N54_WEB_DIR||'dist';
const sourceIndex=join(sourceDir,'index.html');
const outputIndex=join(outputDir,'index.html');
const runtimeSource='node_modules/@capacitor/core/dist/capacitor.js';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error(message)};

if(!existsSync(sourceIndex))fail('Missing canonical www/index.html');
if(!existsSync(runtimeSource))fail('Missing Capacitor runtime. Run npm ci first.');
const before=readFileSync(sourceIndex);
const html=before.toString('utf8');

const required=['eq-polish.js','audio-safety.js','runtime-guards.js','backup.js','boot-ready.js','widget-actions-v2.js','widget-bridge-v2.js','ui-polish-v2.js'];
for(const file of required){
 if(!existsSync(join(sourceDir,file)))fail(`Missing canonical web module: ${file}`);
 if(!html.includes(`src="${file}"`))fail(`Canonical index does not load ${file}`);
}
for(const marker of ['id="viz"','vizBtn','S.viz','function frame()','function sizeCv()','N54_MUTATION_GUARD','src="widget-bridge.js"','src="ui-polish.js"','src="widget-actions.js"','src="n54-events.js"']){
 if(html.includes(marker))fail(`Legacy source marker remains: ${marker}`);
}

rmSync(outputDir,{recursive:true,force:true});
mkdirSync(dirname(outputIndex),{recursive:true});
cpSync(sourceDir,outputDir,{recursive:true,filter:path=>!path.endsWith('/capacitor.js')&&!path.endsWith('\\capacitor.js')});
copyFileSync(runtimeSource,join(outputDir,'capacitor.js'));

const runtime=readFileSync(join(outputDir,'capacitor.js'),'utf8');
for(const marker of ['registerPlugin','isNativePlatform','convertFileSrc'])if(!runtime.includes(marker))fail(`Incomplete Capacitor runtime: ${marker}`);
const built=readFileSync(outputIndex);
if(!built.equals(before))fail('dist/index.html differs from canonical www/index.html');
if(hash(readFileSync(sourceIndex))!==hash(before))fail('www/index.html changed during build');

const pkg=JSON.parse(readFileSync('package.json','utf8'));
writeFileSync(join(outputDir,'build-manifest.json'),JSON.stringify({app:'N54 Audio Deck',version:pkg.version,sourceIndexSha256:hash(before),generatedAt:new Date().toISOString()},null,2)+'\n');
console.log(`✓ immutable web bundle: ${sourceDir} → ${outputDir} (${hash(before).slice(0,12)})`);
