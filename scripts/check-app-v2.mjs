#!/usr/bin/env node
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const fail=msg=>{throw new Error(msg)},html=readFileSync('www/index.html','utf8');
const must=(n,l=n)=>{if(!html.includes(n))fail('Missing: '+l)},absent=(n,l=n)=>{if(html.includes(n))fail('Forbidden: '+l)};
for(const marker of ['AUDIT-FIXES 2026-07','AUDIT-FOLLOWUP 2026-07','COVER-ONLY-PLAYER 2026-07','N54_SMART_HISTORY_FIELDS','N54_RESUME_CHECKPOINTS','N54_RESTORE_LONG_TRACK'])must(marker);
for(const marker of ['id="viz"','vizBtn','S.viz','function frame()','function sizeCv()','N54_COVER_ONLY_COMPAT'])absent(marker,'visualizer residue '+marker);
for(const marker of ['function eqMetrics(gains)','СИНХРОНИЗИРУЮ MEDIASTORE',"new Set((res.knownIds || []).map(id => 'ms' + id))","S.mode === 'radio' || S.qpos >= 0",'currentId && currentId !== t.id && S.queue.includes(currentId)','function setRadioModeUI(on)','x.url_resolved && /^https:'])must(marker);
for(const marker of ['fonts.googleapis.com','fonts.gstatic.com','src="widget-bridge.js"','src="ui-polish.js"','src="widget-actions.js"','src="n54-events.js"','N54_MUTATION_GUARD'])absent(marker);
const start=html.indexOf('<script src="capacitor.js">');if(start<0)fail('Capacitor script marker not found');
const ids=[...html.slice(0,start).matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]),dupes=ids.filter((id,i)=>ids.indexOf(id)!==i);if(dupes.length)fail('Duplicate static ids: '+[...new Set(dupes)].join(', '));
const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n');if(!inline.trim())fail('Inline application script not found');
const tmp='.audit-inline-check.js';writeFileSync(tmp,inline);const syntax=spawnSync(process.execPath,['--check',tmp],{encoding:'utf8'});unlinkSync(tmp);if(syntax.status!==0)fail(syntax.stderr||syntax.stdout);
const webFiles=['widget-bridge-v2.js','eq-polish.js','ui-polish-v2.js','audio-safety.js','runtime-guards.js','backup.js','boot-ready.js','widget-actions-v2.js'];
for(const name of webFiles){const file='www/'+name,checked=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(checked.status!==0)fail(`${file} syntax error:\n${checked.stderr||checked.stdout}`);if(!html.includes(`src="${name}"`))fail(name+' is not loaded')}
const widgetBridge=readFileSync('www/widget-bridge-v2.js','utf8');for(const marker of ['lastState','lastArt','src!==lastArt','attributeFilter'])if(!widgetBridge.includes(marker))fail('Widget bridge invariant missing: '+marker);if(widgetBridge.includes('observe(document.body'))fail('Widget bridge observes the whole body');
const ui=readFileSync('www/ui-polish-v2.js','utf8');if(ui.includes('observe(document.body'))fail('UI polish observes the whole body');
const backup=readFileSync('www/backup.js','utf8');for(const marker of ['SCHEMA=2','MAX_BYTES=5*1024*1024','function validate(raw)','backup rollback:','if(!confirm(message))'])if(!backup.includes(marker))fail('Backup v2 invariant missing: '+marker);
const boot=readFileSync('www/boot-ready.js','utf8');for(const marker of ['N54_BOOT_READY','n54:boot-ready','original(...args)'])if(!boot.includes(marker))fail('Boot lifecycle missing: '+marker);
const actions=readFileSync('www/widget-actions-v2.js','utf8');for(const marker of ['N54_BOOT_READY','n54:boot-ready','consumePending','position','duration','favorite'])if(!actions.includes(marker))fail('Widget action missing: '+marker);
const audioSafety=readFileSync('www/audio-safety.js','utf8');if(!audioSafety.includes('N54_OUTPUT_GUARD_READY'))fail('Output guard marker missing');for(const marker of ['requestFocus','focusChange','lossTransient','abandonFocus'])if(audioSafety.includes(marker))fail('Manual audio focus returned: '+marker);
const config=JSON.parse(readFileSync('capacitor.config.json','utf8'));if(config.android?.allowMixedContent!==false)fail('allowMixedContent must be false');if(config.webDir!=='dist')fail('Capacitor webDir must be dist');
const scanner=readFileSync('native/MusicScannerPlugin.java','utf8');for(const marker of ['ExecutorService worker','worker.execute(() -> doScan(call))','worker.shutdownNow()','ret.put("knownIds", knownIds)'])if(!scanner.includes(marker))fail('Scanner invariant missing: '+marker);
const analyzer=readFileSync('native/AudioAnalyzerPlugin.java','utf8');for(const marker of ['worker.shutdownNow()','classifier.close()'])if(!analyzer.includes(marker))fail('Analyzer lifecycle missing: '+marker);
const extra=readFileSync('scripts/extra-native.mjs','utf8');if(extra.includes("'AudioGuardPlugin.java'")||extra.includes('registerPlugin(AudioGuardPlugin.class)'))fail('AudioGuard must not be packaged');if(!extra.includes('OutputGuardPlugin.class'))fail('OutputGuard registration missing');
const pkg=JSON.parse(readFileSync('package.json','utf8'));if(pkg.version!=='1.1.0'||pkg.scripts?.['test:behavior']!=='node scripts/behavior-tests.mjs'||pkg.scripts?.['build:web']!=='node scripts/build-web.mjs')fail('Package stage-two scripts missing');
console.log(`OK: ${ids.length} unique ids; canonical source is immutable and stage-two ready.`);
