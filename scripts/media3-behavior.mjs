#!/usr/bin/env node
import{readFileSync}from'node:fs';import vm from'node:vm';import assert from'node:assert/strict';
let connected=0,validated=0,activated=0,flag='0';
const plugin={probe:async()=>({available:true,version:'1.10.1'}),connect:async()=>(connected++,{connected:true}),disconnect:async()=>{},validateQueue:async q=>(validated++,{accepted:q.items.length,playbackStarted:false}),setQueue:async q=>(activated++,{accepted:q.items.length,play:q.play}),addListener:async()=>{}};
const events=[];const track={id:'ms1',native:true,title:'Song',artist:'Artist',album:'Album'};
const context=vm.createContext({console,Promise,Error,CustomEvent:class{constructor(type,o){this.type=type;this.detail=o?.detail}},document:{dispatchEvent:e=>events.push(e)},localStorage:{getItem:()=>flag,setItem:(_k,v)=>{flag=v}},S:{queue:['ms1'],qpos:0,byId:new Map([['ms1',track]])},url:()=> 'http://localhost/_capacitor_content_/media/external/audio/1',artURL:()=>'',au:()=>({currentTime:12}),Capacitor:{isNativePlatform:()=>true,isPluginAvailable:()=>true,registerPlugin:()=>plugin}});context.window=context;
vm.runInContext(readFileSync('www/media3-bridge.js','utf8'),context,{filename:'media3-bridge.js'});await Promise.resolve();
const shadow=await context.N54_MEDIA3.validateQueue();assert.equal(shadow.accepted,1);assert.equal(validated,1);assert.equal(activated,0);assert.equal(connected,1);
await assert.rejects(()=>context.N54_MEDIA3.mirrorQueue());assert.equal(activated,0);
context.N54_MEDIA3.setEnabled(true);const active=await context.N54_MEDIA3.mirrorQueue({play:false});assert.equal(active.accepted,1);assert.equal(activated,1);assert.equal(active.play,false);
console.log('OK: Media3 validation is inert and playback activation is feature-gated.');
