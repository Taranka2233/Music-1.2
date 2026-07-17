(()=>{
'use strict';
const cap=window.Capacitor;
const native=!!(cap?.isNativePlatform?.());
const plugin=native&&cap.isPluginAvailable?.('N54Media3')?cap.registerPlugin('N54Media3'):null;
const FLAG='n54_media3_enabled';
const enabled=()=>localStorage.getItem(FLAG)==='1';
const queueItems=()=>{
  if(!window.S?.queue||!window.S?.byId)return[];
  return S.queue.map(id=>S.byId.get(id)).filter(t=>t?.native).map(track=>({
    id:String(track.id||''),
    uri:String(typeof url==='function'?url(track):(track.nativeUri||track.uri||'')),
    title:String(track.title||'Без названия'),
    artist:String(track.artist||'Неизвестный'),
    album:String(track.album||'N54 Audio Deck'),
    artworkUri:String(typeof artURL==='function'?(artURL(track)||''):'')
  })).filter(item=>item.uri);
};
const payload=()=>({items:queueItems(),index:Math.max(0,S.queue.indexOf(S.queue[S.qpos])),position:typeof au==='function'?(Number(au().currentTime)||0):0});
const api={
  available:!!plugin,
  version:'1.10.1',
  get enabled(){return enabled()},
  setEnabled(value){localStorage.setItem(FLAG,value?'1':'0');return enabled()},
  async probe(){return plugin?plugin.probe():{available:false,connected:false,version:'1.10.1'}},
  async connectPreview(){if(!plugin)throw new Error('Media3 unavailable');return plugin.connect()},
  async disconnectPreview(){if(plugin)await plugin.disconnect()},
  async validateQueue(){
    if(!plugin)throw new Error('Media3 unavailable');
    const q=payload();if(!q.items.length)throw new Error('Media3 queue is empty');
    await plugin.connect();
    const result=await plugin.validateQueue(q);
    document.dispatchEvent(new CustomEvent('n54:media3-shadow',{detail:result}));
    return result;
  },
  async mirrorQueue({play=false}={}){
    if(!plugin)throw new Error('Media3 unavailable');
    if(!enabled())throw new Error('Media3 feature flag is disabled');
    const q=payload();if(!q.items.length)throw new Error('Media3 queue is empty');
    await plugin.connect();
    return plugin.setQueue({...q,play:!!play});
  }
};
window.N54_MEDIA3=api;
if(plugin){
  plugin.probe().then(info=>{api.version=info.version||api.version;document.dispatchEvent(new CustomEvent('n54:media3-ready',{detail:{...info,enabled:enabled()}}))}).catch(error=>console.warn('Media3 probe:',error));
  plugin.addListener('state',state=>document.dispatchEvent(new CustomEvent('n54:media3-state',{detail:state}))).catch(()=>{});
  plugin.addListener('error',error=>document.dispatchEvent(new CustomEvent('n54:media3-error',{detail:error}))).catch(()=>{});
}
})();
