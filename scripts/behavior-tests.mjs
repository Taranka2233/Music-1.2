#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const run=(file,extra={})=>{const c=vm.createContext({console,Map,Date,JSON,Math,Number,String,Boolean,Array,Object,Promise,Error,URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},navigator:{},File:class{},CustomEvent:class{constructor(type){this.type=type}},...extra});c.window=c;vm.runInContext(readFileSync(file,'utf8'),c,{filename:file});return c};
async function backup(){
 let cfg={theme:'old'},eq=[{name:'OLD',g:Array(10).fill(0)}],fail=false;
 const track={id:'1',title:'Song',artist:'Artist',album:'Album',dur:600,fav:false,plays:2,skips:1,lastPlayed:10,resumePos:30};
 const context=run('www/backup.js',{structuredClone,DB:{get:async()=>structuredClone(cfg),put:async(_s,v)=>{cfg=structuredClone(v)}},S:{lib:[track],byId:new Map([['1',track]])},save:async()=>{if(fail){fail=false;throw new Error('disk fail')}},toast:()=>{},confirm:()=>true,setTimeout:()=>0,clearTimeout:()=>{},document:{querySelector:()=>null,createElement:()=>({style:{},append(){},click(){},remove(){}}),body:{append(){}}}});
 context.N54_USER_EQ={read:()=>structuredClone(eq),write:v=>{eq=structuredClone(v);return true}};
 const valid={app:'N54 Audio Deck',schema:2,config:{theme:'new'},userEq:[{id:'x',name:'LOUD',g:Array(10).fill(2)}],tracks:[{id:'1',signature:'',fav:true,plays:9,skips:3,lastPlayed:100,resumePos:80}]};
 const result=await context.N54_BACKUP.applyBackupFile({size:100,text:async()=>JSON.stringify(valid)});
 assert.equal(result.restored,1);assert.equal(result.missing,0);assert.equal(cfg.theme,'new');assert.equal(track.plays,9);assert.equal(eq[0].name,'LOUD');
 cfg={theme:'stable'};Object.assign(track,{fav:false,plays:4,skips:0,lastPlayed:5,resumePos:20});fail=true;
 await assert.rejects(()=>context.N54_BACKUP.applyBackupFile({size:100,text:async()=>JSON.stringify({...valid,config:{theme:'broken'},tracks:[{...valid.tracks[0],plays:99}]})}));
 assert.equal(cfg.theme,'stable');assert.equal(track.plays,4);assert.equal(track.fav,false);
 await assert.rejects(()=>context.N54_BACKUP.applyBackupFile({size:6*1024*1024,text:async()=>''}));
 assert.throws(()=>context.N54_BACKUP.validate({app:'Other',schema:2}));
}
async function widget(){
 const events={},clicks={toggle:0,previous:0,next:0,favorite:0},selectors={'#miniPlay':'toggle','#miniPrev':'previous','#miniNext':'next','#nowFav':'favorite'};let listener=null;
 const api={addListener:async(_n,fn)=>{listener=fn},consumePending:async()=>({command:'next'}),update:async()=>{}};
 const document={addEventListener:(n,fn)=>{events[n]=fn},dispatchEvent:e=>events[e.type]?.(e),querySelector:s=>selectors[s]?{click:()=>clicks[selectors[s]]++}:s==='#ct'||s==='#tt'?{textContent:'0:00'}:null};
 const context=run('www/widget-actions-v2.js',{document,setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,S:{mode:'deck'},cur:()=>({fav:false}),Capacitor:{isNativePlatform:()=>true,isPluginAvailable:()=>true,registerPlugin:()=>api}});
 await Promise.resolve();await Promise.resolve();assert.equal(clicks.next,0);context.N54_BOOT_READY=true;events['n54:boot-ready']();assert.equal(clicks.next,1);listener({command:'toggle'});assert.equal(clicks.toggle,1);
 const bootEvents={},boot=run('www/boot-ready.js',{document:{dispatchEvent:e=>bootEvents[e.type]?.(e)},addEventListener:()=>{},setTimeout:()=>0,breach:async()=>42});bootEvents['n54:boot-ready']=()=>{boot.fired=true};assert.equal(await boot.breach(),42);assert.equal(boot.N54_BOOT_READY,true);assert.equal(boot.fired,true);
}
await backup();await widget();console.log('OK: backup rollback, boot-ready and cold widget commands passed.');
