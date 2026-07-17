(()=>{
'use strict';
function mount(){
 if(!Capacitor?.isNativePlatform?.()||document.querySelector('#n54Media3Preview'))return;
 const api=window.N54_MEDIA3,host=document.querySelector('#topBody');if(!api||!host)return;
 const card=document.createElement('div');card.id='n54Media3Preview';card.className='slot';card.style.cssText='margin:10px 12px;align-items:center;gap:10px';
 const copy=document.createElement('div');copy.style.flex='1';
 const title=document.createElement('div');title.className='sl';title.textContent='MEDIA3 ENGINE // PREVIEW';
 const status=document.createElement('div');status.className='sd';status.textContent=api.available?'ЯДРО УСТАНОВЛЕНО · HTML AUDIO АКТИВЕН':'НЕДОСТУПНО В ЭТОЙ СБОРКЕ';
 const button=document.createElement('button');button.className='btn';button.textContent='ПРОВЕРИТЬ';button.disabled=!api.available;
 copy.append(title,status);card.append(copy,button);host.after(card);
 button.onclick=async()=>{
  button.disabled=true;status.textContent='ПОДКЛЮЧЕНИЕ К НАТИВНОМУ СЕРВИСУ…';
  try{
   const probe=await api.probe();await api.connectPreview();
   status.textContent=`MEDIA3 ${probe.version||api.version} · СЕРВИС ГОТОВ · HTML AUDIO АКТИВЕН`;
   window.toast?.('MEDIA3 СЕРВИС ГОТОВ // ЗВУК НЕ ПЕРЕКЛЮЧЁН');
  }catch(error){console.error('Media3 diagnostic:',error);status.textContent='ОШИБКА ПОДКЛЮЧЕНИЯ · HTML AUDIO НЕ ЗАТРОНУТ';window.toast?.('MEDIA3 ДИАГНОСТИКА НЕ ПРОШЛА')}
  finally{try{await api.disconnectPreview()}catch(_error){}button.disabled=false}
 };
}
setTimeout(mount,650);
document.addEventListener('click',event=>{if(event.target.closest?.('#nav button[data-v="sys"]'))setTimeout(mount,80)},true);
})();
