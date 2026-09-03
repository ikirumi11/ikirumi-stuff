/*
  Refactored main module for Shared Gallery.
  This file contains the previous app logic moved from app.js so app.js becomes a tiny bootstrap.
  Kept the implementation mostly unchanged aside from being a module that initializes automatically.
*/

import JSZip from 'jszip';
const room = new WebsimSocket();
let currentCode = null;
let unsubscribe = null;
let currentUser = null;
let currentItems = []; // full ordered list used by viewer
let currentIndex = 0;
let currentRecord = null;
let activeTab = 'media';
let fileRecords = [];
let currentFolderId = null;
let filesUnsubscribe = null;
let spoileeEnabled = true;
let spoileeNumberMap = new Map();

// lazy-render state
const CHUNK_SIZE = 1000;
let renderOffset = 0; // how many items rendered in DOM
let lastRecords = []; // keep latest fetched records so switching tabs can re-render

// DOM
const codeInput = document.getElementById('codeInput');
const joinBtn = document.getElementById('joinBtn');
const controls = document.getElementById('controls');
const galleryWrap = document.getElementById('galleryWrap');
const galleryEl = document.getElementById('gallery');
const emptyEl = document.getElementById('empty');
const scrollUpBtn = document.getElementById('scrollUp');
const scrollDownBtn = document.getElementById('scrollDown');
const currentCodeEl = document.getElementById('currentCode');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const removeAllBtn = document.getElementById('removeAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const leaveBtn = document.getElementById('leaveBtn');
const userInfo = document.getElementById('userInfo');
const filterSelect = document.getElementById('filterSelect');
const toggleImages = document.getElementById('toggleImages');
const toggleVideos = document.getElementById('toggleVideos');
const spoileeToggle = document.getElementById('spoileeToggle');

// viewer elements
const viewer = document.getElementById('viewer');
const viewerImg = document.getElementById('viewerImg');
const viewerVideo = document.getElementById('viewerVideo');
const viewerInner = document.getElementById('viewerInner');
const viewerClose = document.getElementById('viewerClose');
const viewerPrev = document.getElementById('viewerPrev');
const viewerNext = document.getElementById('viewerNext');
// Remove button for fullscreen viewer with typed confirmation security
const viewerRemove = document.createElement('button');
viewerRemove.id = 'viewerRemove';
viewerRemove.className = 'viewer-btn viewer-remove';
viewerRemove.title = 'Remove this item from gallery';
viewerRemove.textContent = 'Remove';
viewerRemove.style.position = 'fixed';
viewerRemove.style.top = '18px';
viewerRemove.style.right = '80px';
viewerRemove.style.zIndex = '10006';
viewerRemove.style.display = 'none';
viewerRemove.style.background = 'rgba(224,75,75,0.14)';
viewerRemove.style.border = '1px solid rgba(224,75,75,0.18)';
viewerRemove.style.color = '#fff';
viewerRemove.style.borderRadius = '8px';
viewerRemove.style.padding = '8px 12px';
viewerRemove.addEventListener('click', async (e) => {
  e.stopPropagation();
  if(!currentRecord || !currentCode) return;
  // typed confirmation security
  const typed = prompt('Type DELETE to permanently remove this item for everyone:');
  if(String(typed || '').trim() !== 'DELETE'){
    alert('Removal cancelled (confirmation did not match).');
    return;
  }
  try {
    viewerRemove.disabled = true;
    // attempt to mark as removed (same behavior as remove buttons elsewhere)
    await room.collection('gallery_v1').update(currentRecord.id, { inGallery: false });
    showToast('Item removed from gallery');
    try { room.send({ type: 'gallery_update', code: currentCode, itemId: currentRecord.id, echo: false }); } catch (err) {}
    // refresh view
    try { await Promise.resolve(room.collection('gallery_v1').filter({ code: currentCode }).getList()).then(renderList); } catch(e){}
    hideViewer();
  } catch (err) {
    console.error('Viewer remove failed', err);
    alert('Unable to remove this item (you may only remove items you uploaded).');
  } finally {
    viewerRemove.disabled = false;
  }
});
document.body.appendChild(viewerRemove);

const filesWrap = document.getElementById('filesWrap');
const filesList = document.getElementById('filesList');
const emptyFiles = document.getElementById('emptyFiles');
const fileBreadcrumbs = document.getElementById('fileBreadcrumbs');
const fileUploadInput = document.getElementById('fileUploadInput');
const fileDropZone = document.getElementById('fileDropZone');
const filesBackBtn = document.getElementById('filesBackBtn');
const newFolderBtn = document.getElementById('newFolderBtn');

async function init(){
  await room.initialize();
  currentUser = await window.websim.getCurrentUser();
  userInfo.textContent = `${currentUser.username}`;

  // Listen for lightweight gallery update events so all clients refetch current gallery immediately.
  room.onmessage = (event) => {
    const data = event.data || event;
    if (data && data.type === 'gallery_update' && data.code && typeof data.code === 'string' && data.code.toLowerCase() === currentCode) {
      const coll = room.collection('gallery_v1');
      Promise.resolve(coll.filter({ code: currentCode }).getList()).then(renderList).catch(console.warn);
      refreshFiles();
    }
  };

  joinBtn.addEventListener('click', joinGallery);
  codeInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') joinGallery(); });
  fileInput.addEventListener('change', onFileChange);

  // Manual add (enter URL) button lets users add an image/video by URL
  const manualAddBtn = document.getElementById('manualAddBtn');
  if (manualAddBtn) {
    manualAddBtn.addEventListener('click', async () => {
      if (!currentCode) return alert('Join a gallery first.');
      const url = (prompt('Enter an image or video URL to add to the gallery:') || '').trim();
      if (!url) return;
      manualAddBtn.disabled = true;
      try {
        const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(url) || /video\//i.test(url);
        const payload = {
          code: currentCode,
          imageUrl: isVideo ? null : url,
          videoUrl: isVideo ? url : null,
          text: null,
          textUrl: null,
          mime: isVideo ? 'video/*' : 'image/*',
          ownerClientId: null,
          ownerUsername: 'anonymous',
          inGallery: true,
          created_at: new Date().toISOString()
        };
        const created = await room.collection('gallery_v1').create(payload);
        try { room.send({ type: 'gallery_update', code: currentCode, itemId: created.id, echo: false }); } catch (e) {}
        try { await room.collection('gallery_v1').filter({ code: currentCode }).getList().then(renderList); } catch (e) {}
        showToast('Added URL to gallery');
      } catch (err) {
        console.error('Manual add failed', err);
        alert('Failed to add the provided URL to the gallery.');
      } finally {
        manualAddBtn.disabled = false;
      }
    });
  }
  uploadBtn.addEventListener('click', uploadSelectedFile);
  leaveBtn.addEventListener('click', leaveGallery);
  if (removeAllBtn) removeAllBtn.addEventListener('click', removeAllInGallery);
  if (downloadAllBtn) downloadAllBtn.addEventListener('click', downloadAllInGallery);

  const tabMedia = document.getElementById('tabMedia');
  const tabFiles = document.getElementById('tabFiles');
  const galleryWrapEl = document.getElementById('galleryWrap');
  const mediaControls = document.getElementById('mediaControls');

  function setActiveTab(t){
    activeTab = t;
    const isMedia = t === 'media';
    tabMedia.classList.toggle('active', isMedia);
    tabFiles.classList.toggle('active', !isMedia);
    galleryWrapEl.classList.toggle('hidden', !isMedia);
    filesWrap.classList.toggle('hidden', isMedia);
    mediaControls.style.display = isMedia ? 'flex' : 'none';
    if (isMedia) {
      renderList(lastRecords || []);
    } else {
      renderFiles();
    }
  }

  tabMedia.addEventListener('click', ()=> setActiveTab('media'));
  tabFiles.addEventListener('click', ()=> setActiveTab('files'));
  filesBackBtn.addEventListener('click', navigateUp);
  newFolderBtn.addEventListener('click', createFolder);
  fileUploadInput.addEventListener('change', () => uploadFiles(fileUploadInput.files));
  fileDropZone.addEventListener('dragover', (event) => { event.preventDefault(); fileDropZone.classList.add('is-dragging'); });
  fileDropZone.addEventListener('dragleave', () => fileDropZone.classList.remove('is-dragging'));
  fileDropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    fileDropZone.classList.remove('is-dragging');
    uploadFiles(event.dataTransfer.files);
  });
  setActiveTab('media');

  if (scrollUpBtn && scrollDownBtn) {
    scrollUpBtn.addEventListener('click', () => scrollOneRow(-1));
    scrollDownBtn.addEventListener('click', () => scrollOneRow(1));
    galleryEl.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);
    updateScrollButtons();
  }

  galleryEl.addEventListener('scroll', onGalleryScroll);

  // viewer events
  viewerClose.addEventListener('click', hideViewer);
  viewerPrev.addEventListener('click', showPrev);
  viewerNext.addEventListener('click', showNext);

  viewer.addEventListener('click', (e) => {
    if(e.target === viewer || e.target === viewerInner) hideViewer();
  });
  document.addEventListener('keydown', (e)=>{
    if(viewer.classList.contains('hidden')) return;
    if(e.key === 'ArrowRight') showNext();
    if(e.key === 'ArrowLeft') showPrev();
    if(e.key === 'Escape') hideViewer();
  });

  const triggerRefetch = () => {
    const coll = room.collection('gallery_v1');
    Promise.resolve(coll.filter({ code: currentCode }).getList()).then(renderList).catch(()=> {
      if(currentItems && currentItems.length) {
        renderList(currentItems);
      }
    });
  };
  if(filterSelect){
    filterSelect.addEventListener('change', triggerRefetch);
  }
  if(toggleImages) toggleImages.addEventListener('change', triggerRefetch);
  if(toggleVideos) toggleVideos.addEventListener('change', triggerRefetch);
  if(spoileeToggle) spoileeToggle.addEventListener('change', () => {
    spoileeEnabled = spoileeToggle.checked;
    triggerRefetch();
  });

  // Copy-share link for opening the gallery externally (uses window.baseUrl)
  if(copyLinkBtn){
    copyLinkBtn.addEventListener('click', async () => {
      if(!currentCode) return alert('Join a gallery first.');
      try {
        const link = `${window.baseUrl || window.location.origin}${window.baseUrl && !window.baseUrl.endsWith('/') ? '' : ''}?gallery=${encodeURIComponent(currentCode)}`;
        if(navigator.clipboard && navigator.clipboard.writeText){
          await navigator.clipboard.writeText(link);
          showToast('Gallery link copied');
        } else {
          // fallback: prompt so user can manually copy
          prompt('Copy this link to share the gallery:', link);
        }
      } catch (err){
        console.warn('Copy failed', err);
        const fallback = `${window.location.origin}?gallery=${encodeURIComponent(currentCode)}`;
        prompt('Copy this link to share the gallery:', fallback);
      }
    });
  }

  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 40;
  viewerInner.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, {passive:true});
  viewerInner.addEventListener('touchend', (e) => {
    const t = (e.changedTouches && e.changedTouches[0]) || {};
    const dx = (t.clientX || 0) - touchStartX;
    const dy = (t.clientY || 0) - touchStartY;
    if(Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD){
      if(dx < 0) showNext(); else showPrev();
    }
  }, {passive:true});
}

// showControls/hideControls/scrollOneRow/updateScrollButtons/joinGallery/leaveGallery/removeAllInGallery/downloadAllInGallery/renderList/loadMore/onGalleryScroll/createCard/openViewer/hideViewer/showNext/showPrev/onFileChange/computeHash/uploadSelectedFile/showToast
// - These functions were moved from app.js to this module as-is to preserve behavior.
// - Tombstones kept in app.js to indicate removal there.

function showControls(forCode){
  controls.classList.remove('hidden');
  galleryWrap.classList.remove('hidden');
  currentCodeEl.textContent = forCode;
  uploadBtn.disabled = true;
  fileInput.value = '';
  if (scrollUpBtn) scrollUpBtn.style.display = 'flex';
  if (scrollDownBtn) scrollDownBtn.style.display = 'flex';
  filesWrap.classList.add('hidden');
  setTimeout(updateScrollButtons, 40);
}

function hideControls(){
  controls.classList.add('hidden');
  galleryWrap.classList.add('hidden');
  currentCodeEl.textContent = '—';
  if (scrollUpBtn) scrollUpBtn.style.display = 'none';
  if (scrollDownBtn) scrollDownBtn.style.display = 'none';
  galleryEl.innerHTML = '';
  galleryEl.scrollTop = 0;
  currentItems = [];
  fileRecords = [];
  currentFolderId = null;
  if(filesUnsubscribe){ filesUnsubscribe(); filesUnsubscribe = null; }
  if(filesList) filesList.innerHTML = '';
  renderOffset = 0;
}

function scrollOneRow(dir = 1){
  if(!galleryEl) return;
  const card = galleryEl.querySelector('.card');
  const gap = parseInt(getComputedStyle(galleryEl).gap) || 12;
  const rowHeight = (card ? card.offsetHeight : 220) + gap;
  galleryEl.scrollBy({ top: dir * rowHeight, left: 0, behavior: 'smooth' });
}

function updateScrollButtons(){
  if(!galleryEl || !scrollUpBtn || !scrollDownBtn) return;
  const maxScroll = galleryEl.scrollHeight - galleryEl.clientHeight;
  if(maxScroll <= 4){
    scrollUpBtn.style.display = 'none';
    scrollDownBtn.style.display = 'none';
    return;
  }
  scrollUpBtn.style.display = galleryEl.scrollTop > 8 ? 'block' : 'none';
  scrollDownBtn.style.display = galleryEl.scrollTop < maxScroll - 8 ? 'block' : 'none';
}

async function joinGallery(){
  const raw = (codeInput.value || '').trim();
  if(!raw) return;
  const code = raw.toLowerCase();
  if(unsubscribe) unsubscribe();
  currentCode = code;
  showControls(raw);

  const coll = room.collection('gallery_v1');
  const filtered = coll.filter({ code });
  unsubscribe = filtered.subscribe(renderList);
  if(filesUnsubscribe) filesUnsubscribe();
  filesUnsubscribe = room.collection('gallery_files_v1').filter({ code }).subscribe((records) => {
    fileRecords = Array.isArray(records) ? records : [];
    renderFiles();
  });

  try {
    const all = (await coll.getList()) || [];
    const matched = all.filter(r => r.code && String(r.code).toLowerCase() === currentCode);
    renderList(matched);
  } catch (err) {
    try { renderList(await filtered.getList()); } catch (e) { console.warn('Join fetch failed', e); }
  }
  await refreshFiles();
}

function leaveGallery(){
  currentCode = null;
  if(unsubscribe){ unsubscribe(); unsubscribe = null; }
  hideControls();
  codeInput.value = '';
}

async function removeAllInGallery(){
  if(!currentCode) return;
  if(!confirm('Remove every image in this gallery? This will mark all images as removed for everyone.')) return;
  const coll = room.collection('gallery_v1');
  removeAllBtn.disabled = true;
  try {
    const all = (await coll.getList()) || [];
    const records = all.filter(r => r.code && String(r.code).toLowerCase() === currentCode);
    let removed = 0;
    for(const r of records){
      if(r.inGallery === false) continue;
      try {
        await coll.update(r.id, { inGallery: false });
        removed++;
      } catch (err) {
        console.warn('Failed to remove record', r.id, err);
      }
    }
    showToast(`Removed ${removed} item${removed === 1 ? '' : 's'}`);
    try {
      room.send({ type: 'gallery_update', code: currentCode, echo: false });
    } catch (err) {}
    try {
      await coll.filter({ code: currentCode }).getList().then(renderList);
    } catch (err) { console.warn('Failed to refresh gallery after bulk remove', err); }
  } catch (err) {
    console.error('Remove all failed', err);
    alert('Failed to remove gallery items.');
  } finally {
    removeAllBtn.disabled = false;
  }
}

async function downloadAllInGallery(){
  if(!currentCode) return alert('Join a gallery first.');
  if(!confirm('Download all images in this gallery as a single ZIP file?')) return;
  const coll = room.collection('gallery_v1');
  downloadAllBtn.disabled = true;
  try {
    const all = (await coll.getList()) || [];
    const records = all.filter(r => r.code && String(r.code).toLowerCase() === currentCode);
    const items = (records.filter(r => (r.inGallery === undefined || r.inGallery === true) && r.imageUrl).reverse());
    const seen = new Set();
    const zip = new JSZip();
    let idx = 0;
    for(const r of items){
      const url = r.imageUrl;
      if(!url || seen.has(url)) continue;
      seen.add(url);
      idx++;
      try {
        const res = await fetch(url);
        if(!res.ok){ console.warn('Failed fetch', url); continue; }
        const blob = await res.blob();
        const ext = (blob.type && blob.type.split('/')[1]) ? '.' + blob.type.split('/')[1].split('+')[0] : '.jpg';
        const name = `${currentCode}-${String(idx).padStart(3,'0')}${ext}`;
        zip.file(name, blob);
      } catch (err) {
        console.warn('Download failed for', url, err);
      }
    }

    if(idx === 0){
      alert('No images found to download.');
      return;
    }

    showToast('Preparing ZIP...');
    const content = await zip.generateAsync({ type: 'blob' }, (meta) => {
      // optional: update progress in button text
      downloadAllBtn.textContent = `Zipping ${Math.round(meta.percent)}%`;
    });

    const zipName = `${currentCode || 'gallery'}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.zip`;
    const a = document.createElement('a');
    const objectUrl = URL.createObjectURL(content);
    a.href = objectUrl;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(objectUrl), 30000);

    showToast(`Downloaded ${idx} image${idx===1?'':'s'} as ZIP`);
  } catch (err) {
    console.error('Download all (zip) failed', err);
    alert('Failed to prepare ZIP of images.');
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = 'Download all';
  }
}

async function refreshFiles(){
  if(!currentCode) return;
  try {
    fileRecords = await room.collection('gallery_files_v1').filter({ code: currentCode }).getList();
    renderFiles();
  } catch (error) {
    console.warn('Unable to refresh files', error);
  }
}

function activeFiles(){
  return (fileRecords || []).filter((item) => item.code && String(item.code).toLowerCase() === currentCode && item.inGallery !== false);
}

function folderPath(folderId){
  const all = activeFiles();
  const byId = new Map(all.map((item) => [item.id, item]));
  const path = [];
  let cursor = folderId;
  const visited = new Set();
  while(cursor && byId.has(cursor) && !visited.has(cursor)){
    visited.add(cursor);
    const folder = byId.get(cursor);
    path.unshift(folder);
    cursor = folder.parentId || null;
  }
  return path;
}

function renderFiles(){
  if(!filesList || !emptyFiles || !fileBreadcrumbs) return;
  const all = activeFiles();
  if(currentFolderId && !all.some((item) => item.id === currentFolderId && item.kind === 'folder')) currentFolderId = null;
  const children = all
    .filter((item) => (item.parentId || null) === currentFolderId)
    .sort((a, b) => (a.kind === b.kind ? String(a.name || '').localeCompare(String(b.name || '')) : a.kind === 'folder' ? -1 : 1));

  filesList.innerHTML = '';
  emptyFiles.classList.toggle('hidden', children.length > 0);
  filesBackBtn.disabled = !currentFolderId;
  fileBreadcrumbs.innerHTML = '';

  const root = document.createElement('button');
  root.className = 'crumb-button';
  root.type = 'button';
  root.textContent = 'Files';
  root.addEventListener('click', () => { currentFolderId = null; renderFiles(); });
  fileBreadcrumbs.appendChild(root);
  for(const folder of folderPath(currentFolderId)){
    const separator = document.createElement('span');
    separator.className = 'crumb-separator';
    separator.textContent = '/';
    const crumb = document.createElement('button');
    crumb.className = 'crumb-button';
    crumb.type = 'button';
    crumb.textContent = folder.name;
    crumb.addEventListener('click', () => { currentFolderId = folder.id; renderFiles(); });
    fileBreadcrumbs.append(separator, crumb);
  }

  for(const item of children){
    const row = document.createElement('div');
    row.className = `file-row ${item.kind === 'folder' ? 'is-folder' : 'is-file'}`;
    const nameCell = document.createElement('div');
    nameCell.className = 'file-name-cell';
    const icon = document.createElement('span');
    icon.className = 'file-icon';
    icon.textContent = item.kind === 'folder' ? '▰' : fileGlyph(item.mime, item.name);
    const name = document.createElement('span');
    name.className = 'file-name';
    name.textContent = item.name || (item.kind === 'folder' ? 'Untitled folder' : 'Untitled file');
    nameCell.append(icon, name);
    if(item.kind === 'folder') {
      row.tabIndex = 0;
      row.addEventListener('click', () => { currentFolderId = item.id; renderFiles(); });
      row.addEventListener('keydown', (event) => { if(event.key === 'Enter' || event.key === ' ') { event.preventDefault(); currentFolderId = item.id; renderFiles(); } });
    }
    const added = document.createElement('div');
    added.className = 'file-detail';
    added.textContent = formatDate(item.created_at);
    const size = document.createElement('div');
    size.className = 'file-detail';
    size.textContent = item.kind === 'folder' ? 'Folder' : formatSize(item.size);
    const actions = document.createElement('div');
    actions.className = 'file-actions';
    if(item.kind !== 'folder' && item.url){
      const open = document.createElement('a');
      open.className = 'file-action';
      open.href = item.url;
      open.target = '_blank';
      open.rel = 'noopener';
      open.textContent = 'Open';
      open.addEventListener('click', (event) => event.stopPropagation());
      actions.appendChild(open);
    }
    const remove = document.createElement('button');
    remove.className = 'file-action remove-file';
    remove.type = 'button';
    remove.textContent = 'Remove';
    remove.addEventListener('click', async (event) => {
      event.stopPropagation();
      const label = item.kind === 'folder' ? 'folder and its contents' : 'file';
      if(!confirm(`Remove this ${label}?`)) return;
      await removeFileEntry(item);
    });
    actions.appendChild(remove);
    row.append(nameCell, added, size, actions);
    filesList.appendChild(row);
  }
}

function fileGlyph(mime = '', name = ''){
  if(String(mime).startsWith('image/')) return '▧';
  if(String(mime).startsWith('video/')) return '▷';
  if(/\.(zip|rar|7z)$/i.test(name)) return '▣';
  return '▤';
}

function formatSize(bytes){
  if(!Number.isFinite(Number(bytes)) || Number(bytes) < 1) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes);
  let unit = 0;
  while(value >= 1024 && unit < units.length - 1){ value /= 1024; unit++; }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

function formatDate(value){
  if(!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function navigateUp(){
  if(!currentFolderId) return;
  const current = activeFiles().find((item) => item.id === currentFolderId);
  currentFolderId = current ? (current.parentId || null) : null;
  renderFiles();
}

async function createFolder(){
  if(!currentCode) return;
  const name = (prompt('Name this folder:') || '').trim();
  if(!name) return;
  try {
    await room.collection('gallery_files_v1').create({
      code: currentCode,
      parentId: currentFolderId,
      kind: 'folder',
      name: name.slice(0, 120),
      inGallery: true
    });
    showToast('Folder created');
    await refreshFiles();
  } catch(error) {
    console.error('Folder creation failed', error);
    alert('Unable to create this folder.');
  }
}

async function uploadFiles(files){
  const selected = Array.from(files || []);
  if(!currentCode || selected.length === 0) return;
  try {
    fileUploadInput.disabled = true;
    for(const file of selected){
      const url = await window.websim.upload(file);
      await room.collection('gallery_files_v1').create({
        code: currentCode,
        parentId: currentFolderId,
        kind: 'file',
        name: file.name.slice(0, 180),
        mime: file.type || 'application/octet-stream',
        size: file.size,
        url,
        inGallery: true
      });
    }
    showToast(`${selected.length} file${selected.length === 1 ? '' : 's'} uploaded`);
    await refreshFiles();
  } catch(error) {
    console.error('File upload failed', error);
    alert('One or more files could not be uploaded.');
  } finally {
    fileUploadInput.value = '';
    fileUploadInput.disabled = false;
  }
}

async function removeFileEntry(entry){
  try {
    const all = activeFiles();
    const ids = new Set([entry.id]);
    if(entry.kind === 'folder'){
      let changed = true;
      while(changed){
        changed = false;
        for(const item of all){
          if(item.parentId && ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); changed = true; }
        }
      }
    }
    for(const id of ids) await room.collection('gallery_files_v1').update(id, { inGallery: false });
    if(ids.has(currentFolderId)) currentFolderId = entry.parentId || null;
    showToast('Removed');
    await refreshFiles();
  } catch(error) {
    console.error('File removal failed', error);
    alert('Unable to remove this item. You can only remove files you uploaded.');
  }
}

function renderList(records){
  // remember latest records so tab switches can re-render the view from cache
  lastRecords = Array.isArray(records) ? records : [];
  if(!currentCode){
    galleryEl.innerHTML = '';
    return;
  }
  let items = records.filter(r => r.code && String(r.code).toLowerCase() === currentCode && (r.inGallery === undefined || r.inGallery === true));
  const showImages = (document.getElementById('toggleImages') ? document.getElementById('toggleImages').checked : true);
  const showVideos = (document.getElementById('toggleVideos') ? document.getElementById('toggleVideos').checked : true);

  const mediaFiltered = items.filter(it => {
    const hasImage = !!it.imageUrl;
    const hasVideo = !!it.videoUrl || (it.mime && String(it.mime).startsWith('video/'));
    return (hasImage && showImages) || (hasVideo && showVideos);
  });

  const sel = (filterSelect && filterSelect.value) || 'new';
  const sorter = (a,b) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return sel === 'old' ? (ta - tb) : (tb - ta);
  };
  items.sort(sorter);
  mediaFiltered.sort(sorter);

  const seen = new Set();
  const deduped = [];
  for(const it of items){
    const key = it.hash || it.imageUrl || it.videoUrl || it.id;
    if(seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  const seenMedia = new Set();
  const dedupedMedia = [];
  for(const it of mediaFiltered){
    const key = it.hash || it.imageUrl || it.videoUrl || it.id;
    if(seenMedia.has(key)) continue;
    seenMedia.add(key);
    dedupedMedia.push(it);
  }

  spoileeNumberMap = new Map();
  if (spoileeEnabled) {
    dedupedMedia.slice().sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return (ta - tb) || String(a.id || '').localeCompare(String(b.id || ''));
    }).forEach((record, i) => spoileeNumberMap.set(record.id, i + 1));
  }

  currentItems = deduped;
  galleryEl.innerHTML = '';
  renderOffset = 0;

  if(dedupedMedia.length === 0){
    emptyEl.classList.remove('hidden');
    galleryEl.classList.remove('scrollable');
  } else {
    emptyEl.classList.add('hidden');
    galleryEl.classList.add('scrollable');
    for(let i = 0; i < dedupedMedia.length; i++){
      const record = dedupedMedia[i];
      const viewerIndex = currentItems.indexOf(record);
      const card = createCard(record, viewerIndex === -1 ? i : viewerIndex);
      galleryEl.appendChild(card);
    }
    renderOffset = dedupedMedia.length;
    setTimeout(updateScrollButtons, 40);
  }

}

function loadMore(){
  if(renderOffset >= currentItems.length) return;
  const end = Math.min(currentItems.length, renderOffset + CHUNK_SIZE);
  for(let i = renderOffset; i < end; i++){
    const record = currentItems[i];
    const card = createCard(record, i);
    galleryEl.appendChild(card);
  }
  renderOffset = end;
  setTimeout(updateScrollButtons, 40);
}

function onGalleryScroll(){
  updateScrollButtons();
  if(!galleryEl) return;
  const threshold = 240;
  const distanceFromBottom = galleryEl.scrollHeight - (galleryEl.scrollTop + galleryEl.clientHeight);
  if(distanceFromBottom < threshold){
    loadMore();
  }
}

function createCard(record, index){
  const el = document.createElement('div');
  el.className = 'card';
  const imgWrap = document.createElement('div');
  imgWrap.className = 'card-image-wrap';

  if(spoileeEnabled){
    const cover = document.createElement('div');
    cover.className = 'spoilee-cover';
    cover.textContent = spoileeNumberMap.get(record.id) || '';
    cover.title = 'Click to reveal in fullscreen';
    cover.tabIndex = 0;
    cover.addEventListener('click', () => openViewer(index));
    cover.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') openViewer(index); });
    imgWrap.appendChild(cover);
  } else if(record.videoUrl || (record.mime && String(record.mime).startsWith('video/'))){
    const vid = document.createElement('video');
    vid.src = record.videoUrl || record.imageUrl;
    vid.poster = record.poster || '';
    vid.muted = true;
    vid.playsInline = true;
    vid.loop = true;
    vid.controls = false;
    vid.style.width = '100%';
    vid.style.height = '100%';
    vid.style.objectFit = 'cover';
    vid.tabIndex = 0;
    vid.addEventListener('click', () => openViewer(index));
    vid.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') openViewer(index); });
    vid.addEventListener('mouseenter', () => { try{ vid.play(); }catch(e){} });
    vid.addEventListener('mouseleave', () => { try{ vid.pause(); vid.currentTime = 0; }catch(e){} });
    imgWrap.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = record.imageUrl;
    img.alt = record.id || '';
    img.tabIndex = 0;
    img.addEventListener('click', () => openViewer(index));
    img.addEventListener('keydown', (e)=>{ if(e.key === 'Enter' || e.key === ' ') openViewer(index); });
    imgWrap.appendChild(img);
  }

  if(record.flagged){
    const badge = document.createElement('div');
    badge.className = 'flag-badge';
    badge.textContent = 'Flagged';
    imgWrap.appendChild(badge);
  }

  el.appendChild(imgWrap);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const spacerLeft = document.createElement('div');
  spacerLeft.style.flex = '1';
  meta.appendChild(spacerLeft);

  const actions = document.createElement('div');
  actions.className = 'actions';

  const removeBtn = document.createElement('button');
  removeBtn.className = 'iconBtn remove';
  removeBtn.textContent = 'Remove';
  removeBtn.title = 'Remove from gallery';
  removeBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await room.collection('gallery_v1').update(record.id, { inGallery: false });
      showToast('Item removed from gallery');
      try {
        room.send({ type: 'gallery_update', code: currentCode, itemId: record.id, echo: false });
      } catch (err) {}
      try {
        await Promise.resolve(room.collection('gallery_v1').filter({ code: currentCode }).getList()).then(renderList);
      } catch (err) { console.warn('Failed to refresh gallery after remove', err); }
    } catch (err) {
      console.error('Remove failed', err);
      alert('Unable to remove this image (you can only remove images you uploaded).');
    }
  });

  const spacer = document.createElement('div');
  spacer.style.width = '8px';
  actions.appendChild(spacer);
  actions.appendChild(removeBtn);
  meta.appendChild(actions);

  el.appendChild(meta);
  return el;
}

function visibleMediaIndexes(){
  const showImages = toggleImages ? toggleImages.checked : true;
  const showVideos = toggleVideos ? toggleVideos.checked : true;
  return currentItems.reduce((indexes, item, index) => {
    const isVideo = !!item.videoUrl || String(item.mime || '').startsWith('video/');
    const isImage = !!item.imageUrl && !isVideo;
    if((isVideo && showVideos) || (isImage && showImages)) indexes.push(index);
    return indexes;
  }, []);
}

function openViewer(index){
  const visible = visibleMediaIndexes();
  if(!visible.length) return;
  currentIndex = visible.includes(index) ? index : visible[0];
  const record = currentItems[currentIndex];
  currentRecord = record;
  if(record.flagged && !confirm('This content has been flagged. View it anyway?')) return;
  const imgEl = document.getElementById('viewerImg');
  const vidEl = document.getElementById('viewerVideo');
  const isVideo = !!record.videoUrl || String(record.mime || '').startsWith('video/');
  if(imgEl){ imgEl.style.display = 'none'; imgEl.src = ''; }
  if(vidEl){ try { vidEl.pause(); } catch(e) {} vidEl.style.display = 'none'; vidEl.src = ''; }
  if(isVideo && vidEl){
    vidEl.src = record.videoUrl || record.imageUrl;
    vidEl.style.display = 'block';
  } else if(imgEl) {
    imgEl.src = record.imageUrl;
    imgEl.alt = record.id || '';
    imgEl.style.display = 'block';
  }
  viewerPrev.style.display = visible.length > 1 ? '' : 'none';
  viewerNext.style.display = visible.length > 1 ? '' : 'none';
  viewerRemove.style.display = '';
  viewer.classList.remove('hidden');
}

function hideViewer(){
  viewer.classList.add('hidden');
  const imgEl = document.getElementById('viewerImg');
  const vidEl = document.getElementById('viewerVideo');
  if(imgEl){ imgEl.src = ''; imgEl.style.display = 'none'; }
  if(vidEl){ try { vidEl.pause(); } catch(e) {} vidEl.src = ''; vidEl.style.display = 'none'; }
  viewerRemove.style.display = 'none';
  currentRecord = null;
}

function showNext(){
  const visible = visibleMediaIndexes();
  if(!visible.length) return;
  const position = visible.indexOf(currentIndex);
  openViewer(visible[(position + 1 + visible.length) % visible.length]);
}

function showPrev(){
  const visible = visibleMediaIndexes();
  if(!visible.length) return;
  const position = visible.indexOf(currentIndex);
  openViewer(visible[(position - 1 + visible.length) % visible.length]);
}

function onFileChange(){
  uploadBtn.disabled = fileInput.files.length === 0;
  if(fileInput.files.length > 1){
    uploadBtn.textContent = `Upload ${fileInput.files.length} images`;
  } else {
    uploadBtn.textContent = 'Upload to gallery';
  }
}

async function computeHash(file){
  try {
    const buf = await file.arrayBuffer();
    const hashBuf = await crypto.subtle.digest('SHA-1', buf);
    const hashArr = Array.from(new Uint8Array(hashBuf));
    return hashArr.map(b => b.toString(16).padStart(2,'0')).join('');
  } catch (err){
    console.warn('Hash failed', err);
    return null;
  }
}

async function uploadSelectedFile(){
  const files = Array.from(fileInput.files || []);
  if(files.length === 0) return;
  if(!currentCode) return alert('Join a gallery code first.');
  uploadBtn.disabled = true;
  const originalText = uploadBtn.textContent;
  uploadBtn.textContent = `Uploading 0/${files.length}...`;
  try {
    const coll = room.collection('gallery_v1');
    const all = (await coll.getList()) || [];
    const existing = all.filter(r => r.code && String(r.code).toLowerCase() === currentCode) || [];

    for(let i=0;i<files.length;i++){
      const file = files[i];
      uploadBtn.textContent = `Uploading ${i+1}/${files.length}...`;

      const fileHash = await computeHash(file);
      if(fileHash){
        const dup = existing.find(r => r.hash === fileHash && (r.inGallery === undefined || r.inGallery === true));
        if(dup){
          showToast('Skipped duplicate file');
          continue;
        }
      }

      const url = await window.websim.upload(file);
      const isVideo = file.type && String(file.type).startsWith('video/');
      const isText = file.type && String(file.type).startsWith('text/');
      const recordPayload = {
        code: currentCode,
        imageUrl: isVideo ? null : (isText ? null : url),
        videoUrl: isVideo ? url : null,
        text: isText ? await file.text() : null,
        textUrl: isText ? url : null,
        mime: file.type || null,
        ownerClientId: null,
        ownerUsername: 'anonymous',
        inGallery: true,
        hash: fileHash || null,
        size: file.size || null,
        created_at: new Date().toISOString()
      };
      const created = await room.collection('gallery_v1').create(recordPayload);
      try { room.send({ type: 'gallery_update', code: currentCode, itemId: created.id, echo: false }); } catch (err) {}
      try {
        await Promise.resolve(room.collection('gallery_v1').filter({ code: currentCode }).getList()).then(renderList);
      } catch (err) { console.warn('Failed to refresh gallery after upload', err); }
      existing.push({ imageUrl: url, hash: fileHash, inGallery: true, code: currentCode });
    }
    fileInput.value = '';
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Upload to gallery';
  } catch (err){
    console.error(err);
    alert('Upload failed.');
    uploadBtn.textContent = originalText || 'Upload to gallery';
  } finally {
    uploadBtn.disabled = true;
  }
}

const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(message, duration = 2200){
  if(!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> {
    toastEl.classList.remove('visible');
    toastEl.classList.add('hidden');
    toastEl.textContent = '';
  }, duration);
}

// Initialize automatically when module loads
init().catch(err => console.error('Gallery init failed', err));

// export for potential future imports (e.g., tests)
export { init };
