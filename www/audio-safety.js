(()=>{
'use strict';
// OutputGuard pauses the active deck directly in the WebView. Do not subscribe
// to the mirrored event here, otherwise one disconnect produces two pauses.
window.N54_OUTPUT_GUARD_READY=true;

// Media3 takeover is restart-only. When the flag is enabled before boot, the
// legacy GPL MediaSession plugin receives no handlers, metadata or position.
// With the default flag off this wrapper is a transparent pass-through.
const legacyMsCall=window.msCall;
if(typeof legacyMsCall==='function'){
 window.msCall=function(method,...args){
  if(localStorage.getItem('n54_media3_enabled')==='1')return null;
  return legacyMsCall.call(this,method,...args);
 };
 window.N54_LEGACY_SESSION_GATE=true;
}
})();
