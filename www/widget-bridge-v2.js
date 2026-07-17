(()=>{
'use strict';
const $=s=>document.querySelector(s),cap=window.Capacitor;
const native=!!(cap?.isNativePlatform?.());let widget=null;
try{if(native&&cap.isPluginAvailable?.('HomeWidget'))widget=cap.registerPlugin('HomeWidget')}catch(e){console.warn('HomeWidget:',e)}

const domain=/\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|cc|ru|me|io)\b/gi;
const noise=/(?:official\s*(?:audio|video)|320\s*kbps|скачать\s*бесплатно|слушать\s*онлайн)/gi;
function cleanTitle(value){
 const original=String(value||'').trim();
 let text=original.replace(/[\[(]\s*(?:www\.)?[^\])]+\s*[\])]/gi,' ').replace(domain,' ').replace(noise,' ');
 text=text.replace(/\.(?:mp3|flac|wav|m4a|ogg|aac|opus|wma)$/i,'').replace(/_+/g,' ').replace(/\s*[-–—]\s*$/,'').replace(/\s{2,}/g,' ').trim();
 return text||original;
}
function polish(root=document){
 root.querySelectorAll?.('#nt,#miniT,.row[data-id] .r1,#topBody .r1,.scan-top .st1').forEach(el=>{const value=cleanTitle(el.textContent);if(value&&value!==el.textContent)el.textContent=value});
}

const style=document.createElement('style');
style.textContent=`
 #stage{background:#090b0f;overflow:hidden}
 #stage::before{content:"";position:absolute;inset:-26px;background:var(--cover-bg,none) center/cover no-repeat;filter:blur(30px) brightness(.32) saturate(.82);transform:scale(1.14);opacity:.82;pointer-events:none;z-index:0}
 #stage::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(5,7,10,.04),rgba(5,7,10,.14));z-index:2}
 #stage #bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;filter:none!important;transform:none!important;opacity:1!important;z-index:1;border-radius:inherit}
 .subdeck{grid-template-columns:repeat(3,1fr)}
 #nt{font-size:clamp(27px,7vw,42px);line-height:.98;overflow-wrap:anywhere}
 #mini{min-height:70px;padding-block:7px}
 .widget-slot{border:1px solid color-mix(in srgb,var(--acc2) 45%,var(--edge))}
 .widget-slot .btn{white-space:nowrap}`;
document.head.appendChild(style);

let fallback='';
function fallbackArt(){
 if(fallback)return fallback;
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');
 x.fillStyle='#11151c';x.fillRect(0,0,256,256);x.fillStyle='#080a0e';x.beginPath();x.arc(128,128,96,0,Math.PI*2);x.fill();x.strokeStyle='#e9dc32';x.lineWidth=5;x.stroke();x.fillStyle='#e9dc32';x.font='700 46px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('N54',128,128);fallback=c.toDataURL('image/png');return fallback;
}
async function loadBitmap(blob){
 if(typeof createImageBitmap==='function')return createImageBitmap(blob);
 const url=URL.createObjectURL(blob),image=new Image();
 try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=url});return image}
 finally{URL.revokeObjectURL(url)}
}
async function compactArtwork(blob){
 const image=await loadBitmap(blob),width=image.width||image.naturalWidth||256,height=image.height||image.naturalHeight||256;
 const scale=Math.min(1,512/Math.max(width,height)),canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
 const ctx=canvas.getContext('2d');ctx.fillStyle='#0b0d12';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 image.close?.();
 return canvas.toDataURL('image/jpeg',.84);
}
let artCache={src:'',data:''};
async function artData(src){
 if(!src)return fallbackArt();
 if(artCache.src===src)return artCache.data;
 try{const blob=await fetch(src).then(r=>r.ok?r.blob():Promise.reject(new Error(String(r.status))));const data=await compactArtwork(blob);artCache={src,data};return data}catch{return fallbackArt()}
}
function syncBackdrop(){const bg=$('#bg'),stage=$('#stage');if(!bg||!stage)return;const src=bg.currentSrc||bg.src||'';stage.style.setProperty('--cover-bg',src?`url("${src.replace(/"/g,'\\"')}")`:'none')}

let timer=0,lastState='',lastArt='';
function scheduleSync(){
 if(!widget)return;
 clearTimeout(timer);timer=setTimeout(async()=>{
  const title=cleanTitle($('#miniT')?.textContent||'НЕТ СИГНАЛА'),artist=$('#miniA')?.textContent||'N54 Audio Deck';
  const playing=!$('#mini')?.classList.contains('dead')&&!($('#a0')?.paused&&$('#a1')?.paused&&$('#a2')?.paused);
  const src=$('#miniArt')?.currentSrc||$('#miniArt')?.src||'',state=`${title}\n${artist}\n${playing}`;
  if(state===lastState&&src===lastArt)return;
  const payload={title,artist,playing};if(src!==lastArt)payload.artData=await artData(src);
  try{await widget.update(payload);lastState=state;lastArt=src}catch(e){console.warn('widget update:',e)}
 },180);
}
function ensureCard(){
 if(!native)return;
 const host=$('#permBody');if(!host||$('#homeWidgetCard'))return;
 const card=document.createElement('div');card.className='slot widget-slot';card.id='homeWidgetCard';
 card.innerHTML='<div style="flex:1"><div class="sl">Виджет главного экрана</div><div class="sd">Компактный и расширенный режимы, прогресс и адресное управление N54.</div></div><button class="btn" id="pinWidgetBtn">ДОБАВИТЬ</button>';
 host.appendChild(card);$('#pinWidgetBtn').onclick=async()=>{try{const result=await widget?.requestPin();toast(result?.requested?'ПОДТВЕРДИ ДОБАВЛЕНИЕ ВИДЖЕТА':'УДЕРЖИ ПУСТОЕ МЕСТО → ВИДЖЕТЫ → N54')}catch{toast('НЕ УДАЛОСЬ ОТКРЫТЬ ВЫБОР ВИДЖЕТА')}};
}
function watch(node,options,callback){if(!node)return;new MutationObserver(callback).observe(node,options)}
function setup(){
 polish();syncBackdrop();ensureCard();scheduleSync();
 const title=$('#miniT'),artist=$('#miniA'),art=$('#miniArt'),bg=$('#bg');
 watch(title,{subtree:true,childList:true,characterData:true},()=>{polish(document);document.dispatchEvent(new CustomEvent('n54:track-change'));scheduleSync()});
 watch(artist,{subtree:true,childList:true,characterData:true},scheduleSync);
 watch(art,{attributes:true,attributeFilter:['src']},scheduleSync);
 watch(bg,{attributes:true,attributeFilter:['src']},syncBackdrop);
 for(const selector of ['#libBody','#topBody','#sheetBody'])watch($(selector),{subtree:true,childList:true,characterData:true},records=>polish(records[0]?.target?.parentElement||document));
 watch($('#permBody'),{childList:true},ensureCard);
 ['play','pause','ended'].forEach(type=>document.addEventListener(type,scheduleSync,true));
}
addEventListener('load',setup,{once:true});if(document.readyState!=='loading')setup();
})();
