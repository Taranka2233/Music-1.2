(()=>{'use strict';
const cap=window.Capacitor;let w=null;
try{if(cap?.isNativePlatform?.()&&cap.isPluginAvailable?.('HomeWidget'))w=cap.registerPlugin('HomeWidget')}catch(e){console.warn('widget',e)}
if(!w)return;
if(document?.createElement&&!document.querySelector('script[data-n54-media3-controls]')){const s=document.createElement('script');s.src='media3-controls.js';s.dataset.n54Media3Controls='1';(document.head||document.body)?.append?.(s)}
const map={toggle:'#miniPlay',previous:'#miniPrev',next:'#miniNext',favorite:'#nowFav'},q=[];
let timer=0,running=false,lastNativeState=null;
async function dispatch(command){
 if(command!=='favorite'&&window.N54_MEDIA3?.mode==='native'&&typeof N54_MEDIA3.command==='function'){
  try{if(await N54_MEDIA3.command(command))return true}catch(error){console.warn('Media3 widget command:',error)}
 }
 const el=document.querySelector(map[command]||'');if(!el)return false;el.click();return true;
}
async function flush(){
 if(running)return;
 if(!window.N54_BOOT_READY){retry();return}
 running=true;
 try{while(q.length){if(!await dispatch(q[0])){retry();return}q.shift()}}finally{running=false}
}
function retry(){if(!timer)timer=setTimeout(()=>{timer=0;flush()},250)}
function push(v){if(map[v]){q.push(v);flush()}}
window.N54_WIDGET_COMMAND=push;
document.addEventListener('n54:boot-ready',flush);
document.addEventListener('n54:media3-state',event=>{lastNativeState=event.detail||null});
w.addListener('command',e=>push(e?.command)).catch?.(()=>{});
w.consumePending().then(e=>push(e?.command)).catch(()=>{});
const sec=v=>String(v||'0:00').split(':').reduce((n,p)=>n*60+(+p||0),0);
setInterval(()=>{
 if(!window.N54_BOOT_READY)return;
 const nativeMode=window.N54_MEDIA3?.mode==='native',state=nativeMode?lastNativeState:null;
 const position=state?Number(state.position)||0:sec(document.querySelector('#ct')?.textContent);
 const duration=state?Number(state.duration)||0:sec(document.querySelector('#tt')?.textContent);
 w.update({position,duration,favorite:S.mode==='deck'&&!!cur()?.fav}).catch(()=>{});
},5000);
})();
