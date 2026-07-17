(()=>{'use strict';
const cap=window.Capacitor,native=!!cap?.isNativePlatform?.(),plugin=native&&cap.isPluginAvailable?.('N54Media3')?cap.registerPlugin('N54Media3'):null;
let connected=false,last=null,error='';
function items(){if(!window.S||!Array.isArray(S.queue)||!S.byId||typeof window.url!=='function')return{items:[],index:0};const out=[];let index=0;S.queue.forEach((id,i)=>{const t=S.byId.get(id);if(!t||!t.native)return;const uri=url(t);if(!uri)return;if(i===S.qpos)index=out.length;out.push({id:String(t.id),uri:String(uri),title:String(t.title||'Без названия'),artist:String(t.artist||'Неизвестный'),album:String(t.album||'N54 Audio Deck')})});return{items:out,index:Math.max(0,Math.min(out.length-1,index))}}
async function connect(){if(!plugin)throw new Error('N54Media3 unavailable');if(connected)return;const s=await plugin.connect();connected=!!s?.connected}
async function validate(){error='';try{await connect();const q=items();last=q.items.length?await plugin.validateQueue(q):{input:0,accepted:0,rejected:0,index:-1,playbackStarted:false};document.dispatchEvent(new CustomEvent('n54:media3-shadow',{detail:last}));return last}catch(e){error=String(e?.message||e);throw e}}
async function disconnect(){if(plugin&&connected)await plugin.disconnect();connected=false}
window.N54_MEDIA3=Object.freeze({available:!!plugin,connect,validate,disconnect,status:()=>({connected,last,error})});
})();
