(()=>{'use strict';
const cap=window.Capacitor;let w=null;
try{if(cap?.isNativePlatform?.()&&cap.isPluginAvailable?.('HomeWidget'))w=cap.registerPlugin('HomeWidget')}catch(e){console.warn('widget',e)}
if(!w)return;
const map={toggle:'#miniPlay',previous:'#miniPrev',next:'#miniNext',favorite:'#nowFav'},q=[];
let timer=0;
function flush(){
 if(!window.N54_BOOT_READY){retry();return}
 while(q.length){const el=document.querySelector(map[q[0]]||'');if(!el){retry();return}el.click();q.shift()}
}
function retry(){if(!timer)timer=setTimeout(()=>{timer=0;flush()},250)}
function push(v){if(map[v]){q.push(v);flush()}}
window.N54_WIDGET_COMMAND=push;
document.addEventListener('n54:boot-ready',flush);
w.addListener('command',e=>push(e?.command)).catch?.(()=>{});
w.consumePending().then(e=>push(e?.command)).catch(()=>{});
const sec=v=>String(v||'0:00').split(':').reduce((n,p)=>n*60+(+p||0),0);
setInterval(()=>{if(!window.N54_BOOT_READY)return;w.update({position:sec(document.querySelector('#ct')?.textContent),duration:sec(document.querySelector('#tt')?.textContent),favorite:S.mode==='deck'&&!!cur()?.fav}).catch(()=>{})},5000);
})();
