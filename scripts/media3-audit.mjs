#!/usr/bin/env node
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const fail=message=>{throw new Error(message)};
const read=path=>{if(!existsSync(path))fail('Missing '+path);return readFileSync(path,'utf8')};
const service=read('native/N54PlaybackService.java');
for(const marker of ['extends MediaSessionService','new ExoPlayer.Builder(this)','setAudioAttributes(audioAttributes, true)','setHandleAudioBecomingNoisy(true)','new MediaSession.Builder(this, player)','mediaSession.getPlayer().release()'])if(!service.includes(marker))fail('Playback service invariant missing: '+marker);
const plugin=read('native/N54Media3Plugin.java');
for(const marker of ['@CapacitorPlugin(name = "N54Media3")','MEDIA3_VERSION = "1.10.1"','new MediaController.Builder','setMediaItems(items, index, positionMs)','notifyListeners("state"','controller.release()'])if(!plugin.includes(marker))fail('Media3 plugin invariant missing: '+marker);
const patcher=read('scripts/patch-android-v2.mjs');
for(const marker of ['media3-exoplayer:${MEDIA3}','media3-session:${MEDIA3}','N54PlaybackService.java','N54Media3Plugin.java','androidx.media3.session.MediaSessionService','android.media.browse.MediaBrowserService','N54Media3Plugin.class'])if(!patcher.includes(marker))fail('Android generator Media3 invariant missing: '+marker);
const bridge=read('www/media3-bridge.js');
for(const marker of ["const FLAG='n54_media3_enabled'","localStorage.getItem(FLAG)==='1'",'setEnabled(value)','connectPreview()','mirrorQueue({play=false}={})'])if(!bridge.includes(marker))fail('Media3 bridge invariant missing: '+marker);
if(/connectPreview\s*\(\s*\)\s*[;}]/.test(bridge)||/plugin\.connect\(\)\s*;?\s*\}\)\(\)/.test(bridge))fail('Media3 must not auto-connect');
const boot=read('www/boot-ready.js');
if(!boot.includes("script.src='media3-bridge.js'"))fail('Media3 bridge loader missing');
for(const path of ['www/media3-bridge.js']){const check=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(check.status!==0)fail(check.stderr||check.stdout)}
console.log('OK: Media3 1.10.1 service/controller are staged behind a disabled-by-default feature flag.');
