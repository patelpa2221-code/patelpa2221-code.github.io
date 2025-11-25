/* script.js — OLX-like SPA behavior using localStorage (JAY BHAVANI MOTORS) */
(() => {
  // Basic SPA elements
  const listingsGrid = document.getElementById('listingsGrid');
  const listingsCount = document.getElementById('listingsCount');
  const noResults = document.getElementById('noResults');

  const searchInput = document.getElementById('globalSearch');
  const categorySelect = document.getElementById('categorySelect');
  const searchBtn = document.getElementById('searchBtn');
  const postAdBtn = document.getElementById('postAdBtn');

  // filters
  const filterCity = document.getElementById('filterCity');
  const filterMinPrice = document.getElementById('filterMinPrice');
  const filterMaxPrice = document.getElementById('filterMaxPrice');
  const applyFilters = document.getElementById('applyFilters');
  const clearFilters = document.getElementById('clearFilters');
  const sortBy = document.getElementById('sortBy');

  // category chips
  document.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
      c.classList.add('active');
      loadAndRender();
    });
  });

  // SPA views
  const addPage = document.getElementById('addPage');
  const backToHome = document.getElementById('backToHome');
  const adForm = document.getElementById('adForm');

  const saveDraftBtn = document.getElementById('saveDraftBtn');
  const previewBtn = document.getElementById('previewBtn');
  const publishBtn = document.getElementById('publishBtn');

  const detailModal = document.getElementById('detailModal');
  const detailContent = document.getElementById('detailContent');
  const closeDetail = document.getElementById('closeDetail');

  // image upload UI elements inside addPage
  const addPhotosBtn = document.getElementById('addPhotosBtn');
  const imageFiles = document.getElementById('imageFiles');
  const dropZone = document.getElementById('dropZone');
  const coverPreview = document.getElementById('coverPreview');
  const thumbs = document.getElementById('thumbs');

  const desc = document.getElementById('desc');
  const descCount = document.getElementById('descCount');

  // storage keys
  const LS_LISTINGS = 'jbm_listings_v1';
  const LS_DRAFTS = 'jbm_drafts_v1';

  // state
  let images = []; // {id, name, url, isCover}
  const MAX_IMAGES = 20;

  // helpers
  const uid = () => Math.random().toString(36).slice(2,9);
  const readFile = (file) => new Promise((res,rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

  // load listings from localStorage
  function loadListings(){
    try { return JSON.parse(localStorage.getItem(LS_LISTINGS) || '[]'); }
    catch(e){ return []; }
  }
  function saveListings(list){ localStorage.setItem(LS_LISTINGS, JSON.stringify(list)); }

  // render grid
  function renderGrid(list){
    listingsGrid.innerHTML = '';
    if (!list.length) { noResults.style.display='block'; listingsCount.textContent = '0 results'; return; }
    noResults.style.display='none'; listingsCount.textContent = `${list.length} results`;
    list.forEach(item => {
      const card = document.createElement('div'); card.className='card';
      const img = document.createElement('img'); img.src = (item.images && item.images.find(i=>i.isCover)?.dataUrl) || (item.images && item.images[0]?.dataUrl) || '';
      img.alt = `${item.make} ${item.model}`;
      const body = document.createElement('div'); body.className='card-body';
      body.innerHTML = `<div class="price">₹ ${item.price ? Number(item.price).toLocaleString() : '—'}</div>
                        <div class="meta">${item.make} ${item.model} • ${item.year || ''}</div>
                        <div class="meta">${item.city || ''} • ${item.kmDriven ? item.kmDriven + ' km' : ''}</div>`;
      const actions = document.createElement('div'); actions.className='card-actions';
      const view = document.createElement('button'); view.className='btn'; view.textContent='View';
      view.addEventListener('click', ()=> openDetail(item.id));
      actions.appendChild(view);
      card.appendChild(img); card.appendChild(body); card.appendChild(actions);
      listingsGrid.appendChild(card);
    });
  }

  // apply search & filters
  function loadAndRender(){
    const all = loadListings();
    let filtered = all.slice();

    // category chip filter (using dataset value)
    const activeChip = document.querySelector('.chip.active')?.dataset?.cat || 'all';
    if (activeChip && activeChip !== 'all') {
      filtered = filtered.filter(i => (i.category || '').toLowerCase().includes(activeChip));
    }

    // search bar / category select
    const q = (searchInput.value || '').trim().toLowerCase();
    if (q) {
      filtered = filtered.filter(i => {
        return (i.make||'').toLowerCase().includes(q) ||
               (i.model||'').toLowerCase().includes(q) ||
               (i.city||'').toLowerCase().includes(q) ||
               (i.description||'').toLowerCase().includes(q);
      });
    }

    // filters
    const minP = Number(filterMinPrice.value) || 0;
    const maxP = Number(filterMaxPrice.value) || Infinity;
    filtered = filtered.filter(i => {
      const p = Number(i.price) || 0;
      return p >= minP && p <= maxP;
    });
    if (filterCity.value) filtered = filtered.filter(i => (i.city || '').toLowerCase().includes(filterCity.value.toLowerCase()));

    // sort
    const s = sortBy.value;
    if (s === 'priceAsc') filtered.sort((a,b)=> (Number(a.price)||0)-(Number(b.price)||0));
    if (s === 'priceDesc') filtered.sort((a,b)=> (Number(b.price)||0)-(Number(a.price)||0));
    if (s === 'newest') filtered.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    renderGrid(filtered);
  }

  // search button
  searchBtn.addEventListener('click', ()=> loadAndRender());
  applyFilters.addEventListener('click', ()=> loadAndRender());
  clearFilters.addEventListener('click', ()=> { filterCity.value=''; filterMinPrice.value=''; filterMaxPrice.value=''; loadAndRender(); });

  // show add page
  postAdBtn.addEventListener('click', ()=> openAddPage());
  backToHome.addEventListener('click', ()=> closeAddPage());

  function openAddPage(){
    addPage.setAttribute('aria-hidden','false');
    // reset form
    adForm.reset();
    images = [];
    renderImages();
    descCount.textContent = '0/1500';
  }
  function closeAddPage(){
    addPage.setAttribute('aria-hidden','true');
  }

  // Image upload UI
  addPhotosBtn.addEventListener('click', ()=> imageFiles.click());
  imageFiles.addEventListener('change', async (e) => {
    await handleFiles(Array.from(e.target.files || [])); imageFiles.value='';
  });

  ['dragenter','dragover'].forEach(ev => dropZone.addEventListener(ev, (e)=>{ e.preventDefault(); dropZone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach(ev => dropZone.addEventListener(ev, (e)=>{ e.preventDefault(); dropZone.classList.remove('dragover'); }));
  dropZone.addEventListener('drop', async (e)=> {
    const dt = e.dataTransfer; if (!dt) return;
    await handleFiles(Array.from(dt.files || []));
  });

  async function handleFiles(list){
    const imgs = list.filter(f => f.type && f.type.startsWith('image/'));
    if (!imgs.length) return alert('Select image files only');
    const space = MAX_IMAGES - images.length;
    const toAdd = imgs.slice(0, space);
    for (const f of toAdd){
      const url = await readFile(f);
      images.push({ id: uid(), name: f.name, dataUrl: url, isCover: images.length===0 });
    }
    renderImages();
  }

  function renderImages(){
    thumbs.innerHTML = '';
    images.forEach((img, idx) => {
      const t = document.createElement('div'); t.className='thumb'; t.draggable=true; t.dataset.id=img.id;
      t.innerHTML = `<img src="${img.dataUrl}" alt="${img.name}"><div class="badge">${img.isCover?'Cover':''}</div><div class="thumb-actions">
        <button class="btn set-cover">${img.isCover?'Cover':'Set'}</button>
        <button class="btn remove">Remove</button>
      </div>`;
      t.addEventListener('dragstart', (e)=> e.dataTransfer.setData('text/plain', img.id));
      t.addEventListener('dragover', (e)=> e.preventDefault());
      t.addEventListener('drop', (e)=> {
        e.preventDefault(); const src = e.dataTransfer.getData('text/plain'); reorderImages(src, img.id);
      });
      t.querySelector('.set-cover').addEventListener('click', ()=> { images.forEach(i=>i.isCover=false); img.isCover=true; renderImages(); });
      t.querySelector('.remove').addEventListener('click', ()=> { images = images.filter(i=>i.id!==img.id); if (!images.some(i=>i.isCover) && images[0]) images[0].isCover=true; renderImages(); });
      thumbs.appendChild(t);
    });
    coverPreview.innerHTML = images.length ? `<img src="${images.find(i=>i.isCover)?.dataUrl || images[0].dataUrl}" style="width:100%;height:100%;object-fit:cover">` : '<div class="cover-text">Cover</div>';
  }
  function reorderImages(srcId, targetId){
    const sidx = images.findIndex(i=>i.id===srcId), tidx = images.findIndex(i=>i.id===targetId);
    if (sidx===-1||tidx===-1) return;
    const [m] = images.splice(sidx,1); images.splice(tidx,0,m); renderImages();
  }

  // desc counter
  desc.addEventListener('input', ()=> { descCount.textContent = `${desc.value.length}/1500`; });

  // save draft
  saveDraftBtn.addEventListener('click', (e)=> {
    e.preventDefault();
    const data = collectForm();
    data._draft = true; data.id = data.id || ('draft_'+uid()); data.createdAt = data.createdAt || new Date().toISOString();
    const drafts = JSON.parse(localStorage.getItem(LS_DRAFTS) || '[]');
    const existing = drafts.findIndex(d=>d.id===data.id);
    if (existing>-1) drafts[existing]=data; else drafts.push(data);
    localStorage.setItem(LS_DRAFTS, JSON.stringify(drafts));
    alert('Draft saved locally.');
  });

  // preview
  previewBtn.addEventListener('click', (e)=> { e.preventDefault(); const data = collectForm(); openDetailPreview(data); });

  // publish
  publishBtn.addEventListener('click', (e)=> {
    e.preventDefault();
    const ok = validateForm();
    if (!ok) return;
    const data = collectForm();
    data.id = 'ad_'+uid(); data.createdAt = new Date().toISOString();
    const all = loadListings(); all.unshift(data); saveListings(all);
    alert('Published (saved locally).');
    closeAddPage(); loadAndRender();
  });

  // collect form
  function collectForm(){
    return {
      id: document.getElementById('adForm').dataset.adId || null,
      make: document.getElementById('make').value.trim(),
      model: document.getElementById('model').value.trim(),
      variant: document.getElementById('variant').value.trim(),
      year: document.getElementById('yearInput').value.trim(),
      kmDriven: document.getElementById('km').value.trim(),
      price: document.getElementById('price').value.trim(),
      fuel: document.getElementById('fuel').value,
      transmission: document.getElementById('transmission').value,
      sellerName: document.getElementById('sellerName').value.trim(),
      sellerPhone: document.getElementById('sellerPhone').value.trim(),
      city: document.getElementById('city').value.trim(),
      locality: document.getElementById('locality').value.trim(),
      showContact: document.getElementById('showContact').value,
      description: desc.value.trim(),
      images: images.map(i=>({ name: i.name, dataUrl: i.dataUrl, isCover: i.isCover })),
      createdAt: new Date().toISOString()
    };
  }

  // validation
  function validateForm(){
    const req = ['make','model','yearInput','km','price','sellerName','sellerPhone'];
    let ok = true;
    req.forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) { el && el.classList.add('error'); ok = false; } else el && el.classList.remove('error');
    });
    if (!images.length) { alert('Add at least one photo'); ok = false; }
    if (!ok) alert('Please fill required fields (highlighted).');
    return ok;
  }

  // open detail modal
  function openDetail(id){
    const all = loadListings();
    const item = all.find(i=>i.id===id);
    if (!item) return alert('Listing not found');
    openDetailPreview(item);
  }
  function openDetailPreview(data){
    detailModal.setAttribute('aria-hidden','false');
    const imgs = (data.images || []).map(i=>`<img src="${i.dataUrl}" style="width:100%;margin-bottom:8px;border-radius:8px">`).join('');
    detailContent.innerHTML = `<div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:300px">${imgs || '<div style="padding:40px;color:#999">No images</div>'}</div>
      <div style="width:320px">
        <h2>${escape(data.make)} ${escape(data.model)}</h2>
        <div class="price">₹ ${Number(data.price).toLocaleString()}</div>
        <div class="meta">${escape(data.city)} • ${escape(data.year)} • ${data.kmDriven ? data.kmDriven+' km':''}</div>
        <hr>
        <div><strong>Seller</strong><br>${escape(data.sellerName)} ${data.showContact==='Yes'?('<br>'+escape(data.sellerPhone)):''}</div>
        <hr>
        <div>${escape(data.description || '')}</div>
      </div></div>`;
  }
  closeDetail.addEventListener('click', ()=> detailModal.setAttribute('aria-hidden','true'));
  detailModal.addEventListener('click', (e)=> { if (e.target === detailModal) detailModal.setAttribute('aria-hidden','true'); });

  // helpers
  function escape(s){ return (s||'').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // seed sample if none
  function seed(){
    const cur = loadListings();
    if (cur.length) return;
    const sample = [
      { id:'ad_a1', make:'Hyundai', model:'Creta', year:'2019', price:850000, kmDriven:42000, city:'Ahmedabad', sellerName:'Jay Motors', createdAt: new Date().toISOString(),
        images:[{name:'1',dataUrl:'data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" alignment-baseline="middle" text-anchor="middle" font-size="24" fill="#666">Sample Car</text></svg>'), isCover:true }]
      }
    ];
    saveListings(sample);
  }

  // initial
  seed(); loadAndRender();

})();