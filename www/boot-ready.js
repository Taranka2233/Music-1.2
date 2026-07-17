(()=>{
'use strict';
const signal=()=>{
 if(window.N54_BOOT_READY)return;
 window.N54_BOOT_READY=true;
 document.dispatchEvent(new CustomEvent('n54:boot-ready'));
};
if(typeof breach==='function'){
 const original=breach;
 breach=async function(...args){
  const result=await original(...args);
  signal();
  return result;
 };
}else addEventListener('load',()=>setTimeout(signal,1500),{once:true});
})();
