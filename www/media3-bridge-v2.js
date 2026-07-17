(()=>{
'use strict';
const cap=window.Capacitor;
const native=!!(cap?.isNativePlatform?.());
const plugin=native&&cap.isPluginAvailable?.('N54Media3')?cap.registerPlugin('N54Media3'):null;
const MODE_KEY='n54_media3_mode';
const LEGACY_FLAG='n54_media3_enabled';
const MODES=new Set(['off','shadow','native']);
const getMode=()=>{
  const saved=localStorage.getItem(MODE_KEY);
  if(MODES.has(saved))return saved;
  return localStorage.getItem(LEGACY_FLAG)==='1'?'shadow':'off';
};
const setMode=value=>{
  const next=MODES.has(value)?value:'off';
  localStorage.setItem(MODE_KEY,next);
  localStorage.removeItem(LEGACY_FLAG);
  return next;
};
const queueSnapshot=()=>{
  if(!window.S?.queue||!window.S?.byId)return{items:[],index:0,position:0};
  const currentId=String(S.queue[S.qpos]??'');
  const items=S.queue.map(id=>S.byId.get(id)).filter(track=>track?.native).map(track=>({
    id:String(track.id||''),
    uri:String(track.nativeUri||track.uri||(typeof url==='function'?url(track):'')),
    title:String(track.title||'Без названия'),
    artist:String(track.artist||'Неизвестный'),
    album:String(track.album||'N54 Audio Deck'),
    artworkUri:String(track.artworkUri||(typeof artURL==='function'?(artURL(track)||''):'')
  })).filter(item=>item.uri);
  const matched=items.findIndex(item=>item.id===currentId);
  return{items,index:matched>=0?matched:0,position:typeof au==='function'?(Number(au().currentTime)||0):0};
};
let connectPromise=null;
const connect=async()=>{
  if(!plugin)throw new Error('Media3 unavailable');
  if(!connectPromise)connectPromise=plugin.connect().catch(error=>{connectPromise=null;throw error});
  return connectPromise;
};
const api={
  available:!!plugin,
  version:'1.10.1',
  get mode(){return getMode()},
  get enabled(){return getMode()!=='off'},
  setMode,
  setEnabled(value){return setMode(value?'shadow':'off')!=='off'},
  async probe(){return plugin?plugin.probe():{available:false,connected:false,version:'1.10.1'}},
  async connectPreview(){return connect()},
  async disconnectPreview(){if(plugin)await plugin.disconnect();connectPromise=null},
  async validateQueue(){
    const q=queueSnapshot();
    if(!q.items.length)throw new Error('Media3 queue is empty');
    await connect();
    const result=await plugin.validateQueue(q);
    document.dispatchEvent(new CustomEvent('n54:media3-shadow',{detail:{...result,mode:getMode()}}));
    return result;
  },
  async mirrorQueue(){
    const currentMode=getMode();
    if(currentMode==='off')throw new Error('Media3 feature flag is disabled');
    const q=queueSnapshot();
    if(!q.items.length)throw new Error('Media3 queue is empty');
    await connect();
    return plugin.setQueue({...q,play:currentMode==='native'});
  },
  async getState(){await connect();return plugin.getState()},
  async stop(){await connect();return plugin.stop?.()},
  async clear(){await connect();return plugin.clearQueue?.()},
  snapshot:queueSnapshot
};
window.N54_MEDIA3=api;
if(plugin){
  plugin.probe().then(info=>{
    api.version=info.version||api.version;
    document.dispatchEvent(new CustomEvent('n54:media3-ready',{detail:{...info,mode:getMode(),enabled:api.enabled}}));
  }).catch(error=>console.warn('Media3 probe:',error));
  plugin.addListener('state',state=>document.dispatchEvent(new CustomEvent('n54:media3-state',{detail:state}))).catch(()=>{});
  plugin.addListener('error',error=>document.dispatchEvent(new CustomEvent('n54:media3-error',{detail:error}))).catch(()=>{});
}
})();
