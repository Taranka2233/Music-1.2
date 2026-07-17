(()=>{
'use strict';
const cap=window.Capacitor;
const plugin=cap?.isNativePlatform?.()&&cap.isPluginAvailable?.('N54Media3')?cap.registerPlugin('N54Media3'):null;
if(!plugin)return;
let ready=null;
const connect=()=>ready||(ready=plugin.connect().catch(error=>{ready=null;throw error}));
async function command(name,payload={}){
 const api=window.N54_MEDIA3;
 if(!api||api.mode!=='native')return false;
 await connect();
 if(name==='toggle'){
  const state=await plugin.getState();
  await (state.playing||state.playWhenReady?plugin.pause():plugin.play());
 }else if(name==='play')await plugin.play();
 else if(name==='pause')await plugin.pause();
 else if(name==='next')await plugin.next();
 else if(name==='previous')await plugin.previous();
 else if(name==='seek')await plugin.seekTo({position:Number(payload.position)||0});
 else if(name==='options')await plugin.setOptions(payload);
 else if(name==='stop'&&plugin.stop)await plugin.stop();
 else return false;
 return true;
}
function install(){
 const api=window.N54_MEDIA3;
 if(!api)return setTimeout(install,25);
 api.command=command;
 api.syncOptions=options=>command('options',options);
 document.dispatchEvent(new CustomEvent('n54:media3-controls-ready'));
}
install();
})();
