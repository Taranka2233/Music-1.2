#!/usr/bin/env node
import{readFileSync}from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
let connected=0,validated=0,activated=0,last=null;const store=new Map();
const plugin={probe:async()=>({available:true,version:'1.10.1'}),connect:async()=>(connected++,{}),disconnect:async()=>{},getState:async()=>({}),stop:async()=>{},clearQueue:async()=>{},validateQueue:async q=>(validated++,last=q,{accepted:q.items.length,index:q.index}),setQueue:async q=>(activated++,last=q,{accepted:q.items.length,index:q.index,play:q.play}),addListener:async()=>{}};
const a={id:'a',native:true,nativeUri:'content://media/external/audio/media/1'},web={id:'web',native:false,uri:'blob:x'},b={id:'b',native:true,uri:'http://localhost/_capacitor_content_/media/external/audio/media/2'};
const c=vm.createContext({console,Promise,Error,Set,Map,CustomEvent:class{},document:{dispatchEvent(){}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},S:{queue:['a','web','b'],qpos:2,byId:new Map([['a',a],['web',web],['b',b]])},url:t=>t.uri||t.nativeUri||'',artURL:()=>'',au:()=>({currentTime:12}),Capacitor:{isNativePlatform:()=>true,isPluginAvailable:()=>true,registerPlugin:()=>plugin}});c.window=c;
vm.runInContext(readFileSync('www/media3-bridge-v2.js','utf8'),c,{filename:'media3-bridge-v2.js'});await Promise.resolve();
assert.equal(c.N54_MEDIA3.mode,'off');const snap=c.N54_MEDIA3.snapshot();assert.equal(snap.items.length,2);assert.equal(snap.index,1);assert.equal(snap.items[0].uri,a.nativeUri);
const shadow=await c.N54_MEDIA3.validateQueue();assert.equal(shadow.index,1);assert.equal(validated,1);assert.equal(activated,0);assert.equal(connected,1);await assert.rejects(()=>c.N54_MEDIA3.mirrorQueue());
c.N54_MEDIA3.setMode('shadow');assert.equal((await c.N54_MEDIA3.mirrorQueue()).play,false);assert.equal(last.index,1);c.N54_MEDIA3.setMode('native');assert.equal((await c.N54_MEDIA3.mirrorQueue()).play,true);assert.equal(last.index,1);
c.N54_MEDIA3.setMode('bad');assert.equal(c.N54_MEDIA3.mode,'off');console.log('OK: Media3 v2 filters queue safely and native mode alone may start playback.');
