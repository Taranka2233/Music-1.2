(()=>{
'use strict';
const APP='N54 Audio Deck',SCHEMA=2,MAX_BYTES=5*1024*1024,MAX_TRACKS=100000;
window.N54_BACKUP_READY=true;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const finite=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Math.max(min,Math.min(max,Number(v)||0));
const sig=t=>[t.title,t.artist,t.album,Math.round(Number(t.dur)||0)].map(v=>String(v||'').trim().toLowerCase()).join('|');

function safeClone(value,depth=0){
 if(depth>12)throw new Error('backup nesting is too deep');
 if(value===null||typeof value==='boolean')return value;
 if(typeof value==='number')return Number.isFinite(value)?value:0;
 if(typeof value==='string')return value.slice(0,10000);
 if(Array.isArray(value)){
  if(value.length>20000)throw new Error('backup array is too large');
  return value.map(v=>safeClone(v,depth+1));
 }
 if(plain(value)){
  const out={};
  for(const [key,item] of Object.entries(value)){
   if(['__proto__','prototype','constructor'].includes(key))continue;
   out[key.slice(0,128)]=safeClone(item,depth+1);
  }
  return out;
 }
 throw new Error('backup contains unsupported data');
}

function cleanEq(rows){
 if(!Array.isArray(rows))return[];
 return rows.slice(0,12).filter(plain).map((row,index)=>({
  id:String(row.id||`import-${index}`).slice(0,64),
  name:String(row.name||'ПРЕСЕТ').trim().slice(0,24)||'ПРЕСЕТ',
  g:Array.isArray(row.g)?row.g.slice(0,10).map(v=>finite(v,-12,12)):[]
 })).filter(row=>row.g.length===10);
}
function cleanTrack(row){
 if(!plain(row))return null;
 const id=String(row.id||'').slice(0,256),signature=String(row.signature||'').slice(0,1000);
 if(!id&&!signature)return null;
 return{id,signature,fav:!!row.fav,plays:finite(row.plays,0,1e9),skips:finite(row.skips,0,1e9),lastPlayed:finite(row.lastPlayed,0,Date.now()+86400000),resumePos:finite(row.resumePos,0,30*86400)};
}
function validate(raw){
 if(!plain(raw)||raw.app!==APP)throw new Error('Это не резервная копия N54');
 const schema=Number(raw.schema)||1;
 if(schema<1||schema>SCHEMA)throw new Error('Версия резервной копии не поддерживается');
 const rows=Array.isArray(raw.tracks)?raw.tracks:[];
 if(rows.length>MAX_TRACKS)throw new Error('В резервной копии слишком много треков');
 return{app:APP,schema,createdAt:String(raw.createdAt||''),config:safeClone(plain(raw.config)?raw.config:{}),userEq:cleanEq(raw.userEq),tracks:rows.map(cleanTrack).filter(Boolean)};
}

async function collect(){
 return{app:APP,schema:SCHEMA,version:'1.1.0',createdAt:new Date().toISOString(),config:safeClone(await DB.get('kv','cfg')||{}),userEq:window.N54_USER_EQ?.read?.()||[],tracks:(S.lib||[]).map(t=>({id:t.id,signature:sig(t),fav:!!t.fav,plays:t.plays||0,skips:t.skips||0,lastPlayed:t.lastPlayed||0,resumePos:t.resumePos||0}))};
}
async function deliver(file){
 if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:APP});return}
 const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
async function exportNow(){
 const data=await collect(),date=new Date().toISOString().slice(0,10);
 await deliver(new File([JSON.stringify(data,null,2)],`n54-backup-${date}.json`,{type:'application/json'}));
 toast('РЕЗЕРВНАЯ КОПИЯ СОЗДАНА');
}
function plan(data){
 const bySig=new Map((S.lib||[]).map(t=>[sig(t),t]));let matched=0,missing=0;
 for(const row of data.tracks){(S.byId.get(row.id)||bySig.get(row.signature))?matched++:missing++}
 return{matched,missing,total:data.tracks.length};
}
async function apply(data){
 const oldConfig=safeClone(await DB.get('kv','cfg')||{}),oldEq=window.N54_USER_EQ?.read?.()||[];
 const bySig=new Map((S.lib||[]).map(t=>[sig(t),t])),changed=[];
 try{
  await DB.put('kv',data.config,'cfg');
  window.N54_USER_EQ?.write?.(data.userEq);
  let restored=0,missing=0;
  for(const row of data.tracks){
   const track=S.byId.get(row.id)||bySig.get(row.signature);
   if(!track){missing++;continue}
   changed.push({track,state:{fav:!!track.fav,plays:track.plays||0,skips:track.skips||0,lastPlayed:track.lastPlayed||0,resumePos:track.resumePos||0}});
   Object.assign(track,{fav:row.fav,plays:row.plays,skips:row.skips,lastPlayed:row.lastPlayed,resumePos:row.resumePos});
   await save(track);restored++;
  }
  return{restored,missing};
 }catch(error){
  try{await DB.put('kv',oldConfig,'cfg');window.N54_USER_EQ?.write?.(oldEq);for(const item of changed){Object.assign(item.track,item.state);await save(item.track)}}catch(rollback){console.error('backup rollback:',rollback)}
  throw error;
 }
}
async function applyBackupFile(file){
 if(!file||file.size>MAX_BYTES)throw new Error('Файл резерва слишком большой');
 const text=await file.text();if(text.length>MAX_BYTES)throw new Error('Файл резерва слишком большой');
 const data=validate(JSON.parse(text)),summary=plan(data);
 const message=`Найдено треков: ${summary.matched}${summary.missing?`\nНе найдено: ${summary.missing}`:''}\nНастройки и EQ будут заменены. Продолжить?`;
 if(!confirm(message))return{cancelled:true,...summary};
 return apply(data);
}

window.N54_BACKUP={collect,deliver,exportNow,validate,plan,applyBackupFile};
const make=(tag,text)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;return node};
async function backupInput(){
 const file=this.files&&this.files[0];this.value='';if(!file)return;
 try{const result=await applyBackupFile(file);if(result.cancelled)return;toast(`ВОССТАНОВЛЕНО: ${result.restored}${result.missing?` · НЕ НАЙДЕНО: ${result.missing}`:''}`);setTimeout(()=>location.reload(),1200)}
 catch(error){console.error(error);toast('ИМПОРТ ОТМЕНЁН // ИСХОДНЫЕ ДАННЫЕ СОХРАНЕНЫ')}
}
function panel(){
 const anchor=document.querySelector('#n54HistoryPanel')||document.querySelector('#topBody');if(!anchor||document.querySelector('#n54BackupPanel'))return;
 const box=make('div');box.id='n54BackupPanel';const title=make('div');title.className='sect';title.append(make('span','РЕЗЕРВНАЯ КОПИЯ'),make('span','JSON V2'));
 const note=make('div','Плейлисты, избранное, EQ, история и настройки. Перед импортом файл проверяется; музыкальные файлы не копируются.');note.className='mono';note.style.cssText='padding:0 12px 9px;color:var(--dim);font-size:8px;line-height:1.55';
 const row=make('div');row.style.cssText='display:flex;gap:8px;padding:0 12px 14px';const exp=make('button','ЭКСПОРТ');exp.className='btn';exp.style.flex='1';const imp=make('button','ИМПОРТ');imp.className='btn g';imp.style.flex='1';
 const input=make('input');input.id='n54BackupInput';input.type='file';input.accept='application/json,.json';input.hidden=true;input.onchange=backupInput;
 exp.onclick=()=>exportNow().catch(e=>{console.error(e);toast('НЕ УДАЛОСЬ СОЗДАТЬ РЕЗЕРВНУЮ КОПИЮ')});imp.onclick=()=>input.click();
 row.append(exp,imp,input);box.append(title,note,row);anchor.after(box);
}
setTimeout(panel,950);
})();
