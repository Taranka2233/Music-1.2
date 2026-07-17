(()=>{'use strict';
const c=window.Capacitor,p=c?.isNativePlatform?.()&&c.isPluginAvailable?.('N54Media3')?c.registerPlugin('N54Media3'):null,K='n54_media3_enabled';let on=false,last=null;
const enabled=()=>localStorage.getItem(K)==='1';
function payload(){const a=[];let x=0;if(!window.S?.queue||!S.byId)return{items:a,index:0,position:0};S.queue.forEach((id,i)=>{const t=S.byId.get(id);if(!t?.native)return;const u=typeof url==='function'?url(t):'';if(!u)return;if(i===S.qpos)x=a.length;a.push({id:String(t.id),uri:String(u),title:String(t.title||'Без названия'),artist:String(t.artist||'Неизвестный'),album:String(t.album||'N54 Audio Deck')})});return{items:a,index:Math.max(0,Math.min(a.length-1,x)),position:typeof au==='function'?Number(au().currentTime)||0:0}}
async function connect(){if(!p)throw Error('Media3 unavailable');if(on)return p.getState();const s=await p.connect();on=!!s?.connected;return s}
async function validate(){await connect();const q=payload();if(!q.items.length)throw Error('Media3 queue is empty');last=await p.validateQueue(q);document.dispatchEvent(new CustomEvent('n54:media3-shadow',{detail:last}));return last}
async function activate(play=false){if(!enabled())throw Error('Media3 feature flag is disabled');await connect();const q=payload();if(!q.items.length)throw Error('Media3 queue is empty');return p.setQueue({...q,play:!!play})}
async function disconnect(){if(p&&on)await p.disconnect();on=false}
window.N54_MEDIA3={available:!!p,version:'1.10.1',get enabled(){return enabled()},get lastValidation(){return last},setEnabled:v=>(localStorage.setItem(K,v?'1':'0'),enabled()),probe:()=>p?p.probe():Promise.resolve({available:false}),validate,activate,disconnect};
if(p)p.probe().then(d=>document.dispatchEvent(new CustomEvent('n54:media3-ready',{detail:{...d,enabled:enabled()}}))).catch(e=>console.warn('Media3 probe:',e));
})();
