(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const style=document.createElement('style');style.textContent=`
 .sheet-in{overscroll-behavior:contain}.sheet-h{z-index:20;isolation:isolate;box-shadow:0 8px 18px rgba(0,0,0,.22)}.sheet-h::after{content:"";position:absolute;inset:0;background:var(--pane);border-radius:26px 26px 0 0;z-index:-1}
 .scan{padding-top:18px}.scan-top{position:relative;z-index:1;min-width:0}.scan-top>div:last-child{min-width:0}.scan-top .st1,.dl dd{white-space:normal;overflow-wrap:anywhere;word-break:break-word;line-height:1.45}
 #nt.n54-long{font-size:clamp(23px,5.9vw,35px)!important;line-height:1.01!important}#nt.n54-xlong{font-size:clamp(19px,5vw,29px)!important;line-height:1.04!important}
 .row[data-id]>.ph{font-size:0;position:relative;background:radial-gradient(circle at center,var(--acc) 0 8%,#0b0d12 9% 20%,#252a32 21% 24%,#0a0c10 25% 42%,#20252d 43% 46%,#090b0f 47% 100%);box-shadow:inset 0 0 0 1px var(--edge)}.row[data-id]>.ph::after{content:"N54";position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-size:6px;font-weight:800;color:var(--ink)}
 .n54-smart-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:18px 12px 8px}.n54-smart{min-height:116px;padding:16px;border:1px solid var(--edge);border-radius:var(--r);background:linear-gradient(145deg,var(--card),var(--pane));text-align:left;position:relative;overflow:hidden}.n54-smart:active{transform:scale(.98)}.n54-smart b{display:block;font-family:var(--disp);font-size:17px;color:var(--txt);text-transform:uppercase}.n54-smart span{display:block;margin-top:7px;font-family:var(--mono);font-size:8px;line-height:1.55;color:var(--dim)}.n54-smart i{position:absolute;right:12px;bottom:8px;font-style:normal;font-family:var(--mono);font-size:22px;color:var(--acc);opacity:.8}
 .n54-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:4px 10px 8px}.n54-stat{margin:0!important;min-height:92px!important;padding:13px 10px!important;align-items:flex-end!important}.n54-stat .sl{font-family:var(--mono);font-size:8px!important;color:var(--dim);letter-spacing:.1em;text-transform:uppercase}.n54-stat .sd{font-family:var(--disp)!important;font-size:20px!important;color:var(--txt)!important;line-height:1.05;margin-top:7px!important}@media(max-width:370px){.n54-smart-grid,.n54-stat-grid{grid-template-columns:1fr}.n54-stat{min-height:68px!important}}`;
document.head.appendChild(style);

function clickNav(view){$(`#nav button[data-v="${view}"]`)?.click()}
function openLibrary(tab){clickNav('lib');setTimeout(()=>{const map={tracks:0,albums:1,artists:2,fav:3};$$('#libTabs button')[map[tab]??0]?.click()},30)}
function playlists(){
 const root=$('#plBody');if(!root||root.querySelector('.n54-smart-grid'))return;
 const empty=root.querySelector('.empty h3');if(!empty||!/нет плейлистов/i.test(empty.textContent||''))return;
 const grid=document.createElement('div');grid.className='n54-smart-grid';
 for(const [go,title,text,icon] of [['fav','Избранное','Все отмеченные сердцем треки.','♥'],['recent','Недавно добавлено','Библиотека в порядке добавления.','＋'],['albums','Альбомы','Готовые подборки из тегов файлов.','▦'],['ai','AI-миксы','Локальные подборки после анализа.','◇']]){
  const button=document.createElement('button');button.className='n54-smart';button.dataset.go=go;const b=document.createElement('b');b.textContent=title;const span=document.createElement('span');span.textContent=text;const i=document.createElement('i');i.textContent=icon;button.append(b,span,i);grid.append(button);
 }
 empty.parentElement.replaceWith(grid);
 grid.onclick=e=>{const go=e.target.closest('[data-go]')?.dataset.go;if(go==='fav')openLibrary('fav');else if(go==='recent')openLibrary('tracks');else if(go==='albums')openLibrary('albums');else if(go==='ai')clickNav('chip')};
}
function stats(){
 const cards=['stTracks','stSize','stTime'].map(id=>$('#'+id)?.closest('.slot')).filter(Boolean);
 if(cards.length!==3||cards[0].parentElement?.classList.contains('n54-stat-grid'))return;
 const grid=document.createElement('div');grid.className='n54-stat-grid';cards[0].before(grid);cards.forEach(card=>{card.classList.add('n54-stat');grid.append(card)});
}
function labels(){
 const shuf=$('#shuf'),rep=$('#rep');if(shuf?.textContent==='SHUF')shuf.textContent='СЛУЧ';if(rep?.textContent==='REP')rep.textContent='ПОВТ';else if(rep?.textContent==='REP·1')rep.textContent='ПОВТ·1';
 const radio=$('#radioBody');if(!radio)return;radio.querySelectorAll('.mono').forEach(el=>{if((el.textContent||'').includes('ЭКВАЛАЙЗЕР И ВИЗУАЛИЗАТОР'))el.textContent='ЭКВАЛАЙЗЕР НА ЭФИР НЕ ВЛИЯЕТ: ПОТОК ИДЁТ НАПРЯМУЮ В ПЛЕЕР И НЕ ПРОХОДИТ ЧЕРЕЗ ЛОКАЛЬНЫЙ АУДИОПРОЦЕССОР.'});
}
function titleSize(){const title=$('#nt');if(!title)return;const n=(title.textContent||'').trim().length;title.classList.toggle('n54-long',n>27&&n<=46);title.classList.toggle('n54-xlong',n>46)}
function observe(selector,callback){const node=$(selector);if(node)new MutationObserver(callback).observe(node,{subtree:true,childList:true,characterData:true})}
function run(){playlists();stats();labels();titleSize()}
observe('#plBody',playlists);observe('#topBody',stats);observe('#radioBody',labels);observe('#nt',titleSize);observe('#shuf',labels);observe('#rep',labels);
document.addEventListener('click',e=>{if(e.target.closest?.('#nav,#libTabs,#plBody'))setTimeout(run,40)},true);
addEventListener('load',run,{once:true});if(document.readyState!=='loading')run();
})();
