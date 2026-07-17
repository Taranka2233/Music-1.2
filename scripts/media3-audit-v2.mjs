#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const read=path=>{if(!existsSync(path))throw new Error('Missing '+path);return readFileSync(path,'utf8')};
const requireMarkers=(name,code,markers)=>{for(const marker of markers)if(!code.includes(marker))throw new Error(`${name} invariant missing: ${marker}`)};
requireMarkers('service',read('native/N54PlaybackService.java'),['extends MediaSessionService','new ExoPlayer.Builder(this)','setAudioAttributes(audioAttributes, true)','setHandleAudioBecomingNoisy(true)','new MediaSession.Builder(this, player)']);
requireMarkers('plugin',read('native/N54Media3Plugin.java'),['@CapacitorPlugin(name = "N54Media3")','MEDIA3_VERSION = "1.10.1"','public void validateQueue','private QueueBuild buildQueue','controller.setMediaItems(queue.items, queue.targetIndex, positionMs)','requestedId.equals(id)','CONTENT_PROXY','FILE_PROXY','MediaController.releaseFuture']);
requireMarkers('generator',read('scripts/patch-android-v2.mjs'),['media3-exoplayer:${MEDIA3}','media3-session:${MEDIA3}','N54PlaybackService.java','N54Media3Plugin.java','androidx.media3.session.MediaSessionService','N54Media3Plugin.class']);
requireMarkers('toolchain',read('scripts/android-toolchain.mjs'),["const AGP='8.12.2'","const GRADLE='8.13'",'const COMPILE_SDK=36']);
const pkg=JSON.parse(read('package.json'));
if(!pkg.scripts?.['capacitor:sync:before']?.includes('android-toolchain.mjs'))throw new Error('Capacitor hook does not apply Android 36 toolchain');
const bridge=read('www/media3-bridge.js');
requireMarkers('bridge',bridge,["const FLAG='n54_media3_enabled'","localStorage.getItem(FLAG)==='1'",'setEnabled(value)','connectPreview()','mirrorQueue({play=false}={})']);
if(/plugin\.connect\(\)\s*;?\s*\}\)\(\)/.test(bridge))throw new Error('Media3 must not auto-connect');
if(!read('www/boot-ready.js').includes("script.src='media3-bridge.js'"))throw new Error('Media3 loader missing');
const syntax=spawnSync(process.execPath,['--check','www/media3-bridge.js'],{encoding:'utf8'});
if(syntax.status!==0)throw new Error(syntax.stderr||syntax.stdout);
console.log('OK: Media3 queue preview is disabled by default and compiles on API 36 toolchain.');
