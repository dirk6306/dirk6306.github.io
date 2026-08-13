const feeds = ['All','Clearance','Computers','Electronics','Featured','Home','Gourmet','Shirts','Sports','Tools','Wootoff'];
const state = {feed:'All',items:[],query:'',minDiscount:0,sort:'percent',saved:new Set(JSON.parse(localStorage.getItem('wootScoutSaved')||'[]')),mode:'deals'};

const $ = s => document.querySelector(s);
const dealGrid=$('#dealGrid'), statusEl=$('#status'), resultCount=$('#resultCount'), dealCount=$('#dealCount');

function money(n){return Number.isFinite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n):'—'}
function priceMin(range){return range && Number.isFinite(range.Minimum)?range.Minimum:null}
function discount(item){const list=priceMin(item.ListPrice), sale=priceMin(item.SalePrice); if(!list||!sale||list<=sale)return 0; return Math.round((list-sale)/list*100)}
function savings(item){const list=priceMin(item.ListPrice), sale=priceMin(item.SalePrice); return list&&sale?Math.max(0,list-sale):0}
function category(item){const c=(item.Categories||[])[0]||'Woot'; return c.replaceAll('_',' ')}
function esc(s=''){return String(s).replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}

function renderChips(){
  $('#categoryChips').innerHTML=feeds.map(f=>`<button class="chip ${state.feed===f?'active':''}" data-feed="${f}">${f==='Wootoff'?'Woot-Off':f}</button>`).join('');
  document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>loadFeed(b.dataset.feed));
}

async function loadFeed(feed='All', force=false){
  state.feed=feed; renderChips(); statusEl.hidden=false; statusEl.textContent=`Loading ${feed} deals…`; dealGrid.innerHTML='';
  try{
    const res=await fetch(`/api/feed?name=${encodeURIComponent(feed)}${force?'&refresh=1':''}`);
    if(!res.ok) throw new Error((await res.json().catch(()=>({}))).error||`Request failed (${res.status})`);
    const data=await res.json(); state.items=Array.isArray(data.Items)?data.Items:[]; dealCount.textContent=state.items.length.toLocaleString(); applyFilters();
  }catch(err){ statusEl.hidden=false; statusEl.textContent=`Couldn’t load Woot: ${err.message}`; }
}

function filtered(){
  let rows=state.items.slice();
  if(state.mode==='saved') rows=rows.filter(i=>state.saved.has(i.OfferId));
  const q=state.query.trim().toLowerCase();
  if(q) rows=rows.filter(i=>[i.Title,i.Subtitle,...(i.Categories||[])].filter(Boolean).join(' ').toLowerCase().includes(q));
  rows=rows.filter(i=>discount(i)>=state.minDiscount);
  rows.sort((a,b)=>{
    if(state.sort==='dollars') return savings(b)-savings(a);
    if(state.sort==='priceLow') return (priceMin(a.SalePrice)??Infinity)-(priceMin(b.SalePrice)??Infinity);
    if(state.sort==='priceHigh') return (priceMin(b.SalePrice)??-Infinity)-(priceMin(a.SalePrice)??-Infinity);
    if(state.sort==='newest') return new Date(b.StartDate||0)-new Date(a.StartDate||0);
    return discount(b)-discount(a) || savings(b)-savings(a);
  });
  return rows;
}

function applyFilters(){
  const rows=filtered(); statusEl.hidden=true; resultCount.textContent=`${rows.length.toLocaleString()} shown`;
  $('#resultsLabel').textContent=state.mode==='saved'?'SAVED DEALS':state.query?'SEARCH RESULTS':'BIGGEST DISCOUNTS';
  $('#resultsTitle').textContent=state.mode==='saved'?'Your watch pile':state.query?`Matches for “${state.query}”`:'Top markdowns right now';
  if(!rows.length){dealGrid.innerHTML='<div class="empty">No matching live deals. Try lowering the discount filter or switching categories.</div>';return}
  dealGrid.innerHTML=rows.map(card).join('');
  document.querySelectorAll('.save-btn').forEach(btn=>btn.onclick=e=>{e.preventDefault();e.stopPropagation();toggleSave(btn.dataset.id);});
}

function card(i){
  const sale=priceMin(i.SalePrice), list=priceMin(i.ListPrice), pct=discount(i), save=savings(i), saved=state.saved.has(i.OfferId);
  return `<article class="deal-card">
    <a href="${esc(i.Url||'#')}" target="_blank" rel="noopener noreferrer">
      <div class="deal-image-wrap">
        <img class="deal-image" src="${esc(i.Photo||'')}" alt="" loading="lazy" />
        ${pct?`<span class="discount-pill">${pct}% OFF</span>`:''}
        <button class="save-btn ${saved?'saved':''}" data-id="${esc(i.OfferId)}" aria-label="Save deal">${saved?'♥':'♡'}</button>
      </div>
      <div class="deal-body">
        <div class="category-line">${esc(category(i))}</div>
        <div class="deal-title">${esc(i.Title||'Woot deal')}</div>
        <div class="price-row"><span class="sale-price">${money(sale)}</span>${list&&list>sale?`<span class="list-price">${money(list)}</span>`:''}</div>
        ${save>0?`<div class="save-line">Save ${money(save)}${pct?` · ${pct}% off`:''}</div>`:''}
        <div class="meta-line">${esc(i.Condition||'See Woot for condition')}${i.IsFeatured?' · Featured':''}${i.IsWootOff?' · Woot-Off':''}</div>
      </div>
    </a>
  </article>`;
}

function toggleSave(id){state.saved.has(id)?state.saved.delete(id):state.saved.add(id); localStorage.setItem('wootScoutSaved',JSON.stringify([...state.saved])); applyFilters();}

$('#searchInput').addEventListener('input',e=>{state.query=e.target.value;state.mode='deals';applyFilters()});
$('#clearSearch').onclick=()=>{$('#searchInput').value='';state.query='';applyFilters()};
$('#sortSelect').onchange=e=>{state.sort=e.target.value;applyFilters()};
$('#discountSelect').onchange=e=>{state.minDiscount=Number(e.target.value);applyFilters()};
$('#refreshBtn').onclick=()=>loadFeed(state.feed,true);

document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{
  const p=b.dataset.preset; state.mode='deals';
  if(p==='70'){state.minDiscount=70;$('#discountSelect').value='70';applyFilters();}
  if(p==='under25'){state.minDiscount=0;$('#discountSelect').value='0';state.sort='priceLow';$('#sortSelect').value='priceLow';state.query='';$('#searchInput').value='';applyFilters();}
  if(p==='clearance'){loadFeed('Clearance');}
});

document.querySelectorAll('[data-nav]').forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  const nav=btn.dataset.nav;
  if(nav==='search'){$('#searchInput').focus();state.mode='deals';}
  else if(nav==='saved'){state.mode='saved';applyFilters();}
  else {state.mode='deals';applyFilters();}
});

if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
renderChips(); loadFeed('All');
