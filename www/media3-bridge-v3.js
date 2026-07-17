(()=>{
'use strict';
const cap=window.Capacitor;
const native=!!cap?.isNativePlatform?.();
const plugin=native&&cap.isPluginAvailable?.('N54Media3')?cap.registerPlugin('N54Media3'):null;
const MODE_KEY='n54_media3_mode';
const LEGACY_KEY='n54_media3_enabled';
const MODES=new Set(['off','shadow','native']);
const readMode=()=>{
  const saved=localStorage.getItem(MODE_KEY);
  if(MODES.has(saved))return saved;
  return localStorage.getItem(LEGACY_KEY)==='1'?'shadow':'off';
};
const writeMode=value=>{
  const next=MODES.has(value)?value:'off';
  localStorage.setItem(MODE_KEY,next);
  localStorage.removeItem(LEGACY_KEY);
  return next;
};
const queueSnapshot=()=>{
  if(!window.S?.queue||!window.S?.byId)return{items:[],index:0,position:0};
  const currentId=String(S.queue[S.qpos]??'');
  const items=[];
  for(const id of S.queue){
    const track=S.byId.get(id);
    if(!track?.native)continue;
    const fallbackUri=typeof url==='function'?url(track):'';
    const fallbackArt=typeof artURL==='function'?(artURL(track)||''):'';
    const uri=String(track.nativeUri||track.uri||fallbackUri||'');
    if(!uri)continue;
    items.push({
      id:String(track.id||''),
      uri,
      title:String(track.title||'Без названия'),
      artist:String(track.artist||'Неизвестный'),
      album:String(track.album||'N54 Audio Deck'),
      artworkUri:String(track.artworkUri||fallbackArt||'')
    });
  }
  const matched=items.findIndex(item=>item.id===currentId);
  const position=typeof au==='function'?(Number(au().currentTime)||0):0;
  return{items,index:matched>=0?matched:0,position};
};
let connection=null;
const connect=async()=>{
  if(!plugin)throw new Error('Media3 unavailable');
  if(!connection)connection=plugin.connect().catch(error=>{connection=null;throw error});
  return connection;
};
const api={
  available:!!plugin,
  version:'1.10.1',
  get mode(){return readMode()},
  get enabled(){return readMode()!=='off'},
  setMode:writeMode,
  setEnabled(value){return writeMode(value?'shadow':'off')!=='off'},
  snapshot:queueSnapshot,
  async probe(){return plugin?plugin.probe():{available:false,connected:false,version:'1.10.1'}},
  async connectPreview(){return connect()},
  async disconnectPreview(){if(plugin)await plugin.disconnect();connection=null},
  async validateQueue(){
    const queue=queueSnapshot();
    if(!queue.items.length)throw new Error('Media3 queue is empty');
    await connect();
    const result=await plugin.validateQueue(queue);
    document.dispatchEvent(new CustomEvent('n54:media3-shadow',{detail:{...result,mode:readMode()}}));
    return result;
  },
  async mirrorQueue(){
    const currentMode=readMode();
    if(currentMode==='off')throw new Error('Media3 feature flag is disabled');
    const queue=queueSnapshot();
    if(!queue.items.length)throw new Error('Media3 queue is empty');
    await connect();
    return plugin.setQueue({...queue,play:currentMode==='native'});
  },
  async getState(){await connect();return plugin.getState()},
  async stop(){await connect();if(plugin.stop)return plugin.stop()},
  async clear(){await connect();if(plugin.clearQueue)return plugin.clearQueue()}
};
window.N54_MEDIA3=api;
if(plugin){
  plugin.probe().then(info=>{
    api.version=info.version||api.version;
    document.dispatchEvent(new CustomEvent('n54:media3-ready',{detail:{...info,mode:readMode(),enabled:api.enabled}}));
  }).catch(error=>console.warn('Media3 probe:',error));
  plugin.addListener('state',state=>document.dispatchEvent(new CustomEvent('n54:media3-state',{detail:state}))).catch(()=>{});
  plugin.addListener('error',error=>document.dispatchEvent(new CustomEvent('n54:media3-error',{detail:error}))).catch(()=>{});
}
})();
