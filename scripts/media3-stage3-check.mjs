#!/usr/bin/env node
import{existsSync,readFileSync}from'node:fs';import{spawnSync}from'node:child_process';
const get=p=>{if(!existsSync(p))throw Error('Missing '+p);return readFileSync(p,'utf8')};
const need=(n,c,m)=>{if(!c.includes(m))throw Error(n+': '+m)};
const service=get('native/N54PlaybackService.java');need('service',service,'extends MediaSessionService');need('service',service,'setHandleAudioBecomingNoisy(true)');
const plugin=get('native/N54Media3Plugin.java');for(const m of ['N54Media3','1.10.1','validateQueue','setMediaItems','CONTENT_PROXY','FILE_PROXY'])need('plugin',plugin,m);
const bridge=get('www/media3-bridge-v3.js');for(const m of ['n54_media3_mode','off','shadow','native','findIndex','nativeUri','mirrorQueue'])need('bridge',bridge,m);
const boot=get('www/boot-ready.js');need('loader',boot,'media3-bridge-v3.js');
const hook=get('package.json');need('hook',hook,'media3-private-pilot-v2.mjs');
const patch=get('scripts/media3-private-pilot-v2.mjs');for(const m of ['exported="false"','content://','file:///'])need('patch',patch,m);
const syntax=spawnSync(process.execPath,['--check','www/media3-bridge-v3.js'],{encoding:'utf8'});if(syntax.status)throw Error(syntax.stderr||syntax.stdout);
console.log('OK: Media3 stage 3 pilot is private, gated and syntax-valid.');
