(()=>{
'use strict';
window.N54_RUNTIME_READY=true;
const make=(tag,text)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;return node};
const top=document.querySelector('#topBody');
if(!top||document.querySelector('#n54HistoryPanel'))return;
const box=make('div');box.id='n54HistoryPanel';
const title=make('div');title.className='sect';title.append(make('span','УМНАЯ ИСТОРИЯ'),make('span','ЛОКАЛЬНО'));
const tabs=make('div');tabs.style.cssText='display:flex;gap:7px;padding:0 12px 9px';
for(const item of [['recent','НЕДАВНО'],['often','ЧАСТО'],['forgotten','ДАВНО']]){
 const button=make('button',item[1]);button.className=item[0]==='recent'?'btn':'btn g';button.dataset.historyMode=item[0];button.style.flex='1';tabs.append(button);
}
const list=make('div');list.id='n54HistoryList';let mode='recent';
function rowsForMode(){
 const rows=(S.lib||[]).slice();
 if(mode==='often')return rows.filter(t=>(t.plays||0)>0).sort((a,b)=>(b.plays||0)-(a.plays||0)||b.lastPlayed-a.lastPlayed).slice(0,10);
 if(mode==='forgotten'){
  const cutoff=Date.now()-14*86400000;
  return rows.filter(t=>t.lastPlayed>0&&t.lastPlayed<cutoff).sort((a,b)=>a.lastPlayed-b.lastPlayed).slice(0,10);
 }
 return rows.filter(t=>t.lastPlayed>0).sort((a,b)=>b.lastPlayed-a.lastPlayed).slice(0,10);
}
function note(track){
 if(mode==='often')return `${track.plays||0} ПРОСЛУШИВАНИЙ`;
 const days=Math.max(0,Math.floor((Date.now()-(track.lastPlayed||Date.now()))/86400000));
 return mode==='forgotten'?`${days} ДН. БЕЗ СИГНАЛА`:days?`${days} ДН. НАЗАД`:'СЕГОДНЯ';
}
function renderHistory(){
 list.replaceChildren();
 const rows=rowsForMode();
 if(!rows.length){const empty=make('div',mode==='forgotten'?'ДАВНО ЗАБЫТЫХ ТРЕКОВ ПОКА НЕТ.':'ИСТОРИЯ ПОЯВИТСЯ ПОСЛЕ ПРОСЛУШИВАНИЯ.');empty.className='mono';empty.style.cssText='padding:10px 12px;color:var(--dim);font-size:9px';list.append(empty);return}
 for(const track of rows){
  const button=make('button');button.className='row';button.dataset.historyId=track.id;
  const info=make('div');info.className='ri';const name=make('div',track.title);name.className='r1';const artist=make('div',`${track.artist} · ${note(track)}`);artist.className='r2';info.append(name,artist);button.append(info);list.append(button);
 }
}
tabs.addEventListener('click',event=>{const button=event.target.closest('[data-history-mode]');if(!button)return;mode=button.dataset.historyMode;tabs.querySelectorAll('button').forEach(x=>x.className=x===button?'btn':'btn g');renderHistory()});
list.addEventListener('click',event=>{const id=event.target.closest('[data-history-id]')?.dataset.historyId;if(id)setQueue(S.lib.map(t=>t.id),id)});
box.append(title,tabs,list);top.after(box);setTimeout(renderHistory,700);
document.addEventListener('click',event=>{if(event.target.closest?.('#nav button[data-v="sys"]'))setTimeout(renderHistory,80)},true);
})();
