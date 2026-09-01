/* ─── ASBKI CMS Admin App ─────────────────────────────────────────────── */

let token  = localStorage.getItem('cms_token') || '';
let content = {};
let dirty  = false;

/* ─── Utils ──────────────────────────────────────────────────────────── */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const parent = keys.reduce((o, k) => o[k], obj);
  if (parent) parent[last] = value;
}

function showToast(msg, type = 'success') {
  const t = document.querySelector('#toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function setSaveStatus(text, type) {
  const el = document.querySelector('#save-status');
  if (!text) { el.style.display = 'none'; return; }
  el.textContent  = text;
  el.className    = `save-status ${type}`;
  el.style.display = '';
}

function markDirty() {
  dirty = true;
  setSaveStatus('Alterações não guardadas', 'saving');
}

/* ─── Login ───────────────────────────────────────────────────────────── */
document.querySelector('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = document.querySelector('#login-btn');
  const pwd = document.querySelector('#login-pwd').value;
  const err = document.querySelector('#login-error');
  btn.disabled = true;
  btn.textContent = 'A verificar…';
  err.classList.remove('show');

  try {
    const res  = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pwd }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('cms_token', token);
    bootApp();
  } catch {
    err.classList.add('show');
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

document.querySelector('#logout-btn').addEventListener('click', () => {
  token = '';
  localStorage.removeItem('cms_token');
  document.querySelector('#app').hidden = true;
  document.querySelector('#login-screen').style.display = '';
});

/* ─── Boot ────────────────────────────────────────────────────────────── */
async function bootApp() {
  document.querySelector('#login-screen').style.display = 'none';
  document.querySelector('#app').hidden = false;
  await loadContent();
  initNav();
  loadImages();
}

/* Auto-login if token exists */
if (token) {
  fetch('/api/content')
    .then(r => r.ok ? bootApp() : null)
    .catch(() => {});
}

/* ─── Load content ────────────────────────────────────────────────────── */
async function loadContent() {
  try {
    const res = await fetch('/api/content?v=' + Date.now());
    content   = await res.json();
    populateFields();
    renderDynamicSections();
    dirty = false;
    setSaveStatus('', '');
    document.querySelector('#last-saved').textContent = 'Carregado às ' + new Date().toLocaleTimeString('pt-PT');
  } catch {
    showToast('Erro ao carregar conteúdo', 'error');
  }
}

/* ─── Populate all [data-path] inputs ─────────────────────────────────── */
function populateFields() {
  document.querySelectorAll('[data-path]').forEach(el => {
    const val = getPath(content, el.dataset.path);
    if (val !== undefined) el.value = val ?? '';
    el.removeEventListener('input', onFieldInput);
    el.addEventListener('input', onFieldInput);
  });

  /* About features textarea */
  const featTa = document.querySelector('#about-features-input');
  if (featTa && content.about?.features) {
    featTa.value = content.about.features.join('\n');
    featTa.removeEventListener('input', onFeaturesInput);
    featTa.addEventListener('input', onFeaturesInput);
  }

  /* Image previews */
  if (content.site?.logo)             showImgPreview('logo-preview', content.site.logo);
  if (content.hero?.backgroundImage)  showImgPreview('hero-img-preview', content.hero.backgroundImage);
  if (content.hero?.foregroundImage)  showImgPreview('hero-fg-preview', content.hero.foregroundImage);
  if (content.about?.image)           showImgPreview('about-img-preview', content.about.image);
}

function onFieldInput(e) {
  setPath(content, e.target.dataset.path, e.target.value);
  markDirty();
}
function onFeaturesInput(e) {
  content.about.features = e.target.value.split('\n').filter(l => l.trim());
  markDirty();
}

/* ─── Dynamic sections ───────────────────────────────────────────────── */
function renderDynamicSections() {
  renderNavLinks();
  renderBenefits();
  renderClasses();
  renderStats();
  renderSchedule();
}

function renderNavLinks() {
  const list = document.querySelector('#nav-links-list');
  if (!list) return;
  list.innerHTML = (content.nav?.links || []).map((l, i) => `
    <div class="schedule-editor-row" style="margin-bottom:8px">
      <div class="field" style="margin-bottom:0">
        <label>Texto</label>
        <input type="text" value="${esc(l.label)}" placeholder="Início" oninput="updateNavLink(${i},'label',this.value)">
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Link (âncora)</label>
        <input type="text" value="${esc(l.href)}" placeholder="#inicio" oninput="updateNavLink(${i},'href',this.value)">
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeNavLink(${i})">✕</button>
    </div>`).join('');
}

function updateNavLink(i, key, val) { content.nav.links[i][key] = val; markDirty(); }
function removeNavLink(i) { content.nav.links.splice(i, 1); renderNavLinks(); markDirty(); }
window.addNavLink = function() {
  content.nav.links.push({ label: 'Novo Link', href: '#' });
  renderNavLinks();
  markDirty();
};

function renderBenefits() {
  const list = document.querySelector('#benefits-list');
  list.innerHTML = (content.benefits || []).map((b, i) => `
    <div class="editor-card list-item" id="benefit-${i}">
      <div class="list-item-header">
        <div class="list-item-label">Benefício ${i + 1}</div>
        <button class="btn btn-danger btn-sm" onclick="removeBenefit(${i})">Remover</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Ícone</label>
          <select onchange="updateBenefit(${i},'icon',this.value)">
            ${['shield','lock','dumbbell','target'].map(ic =>
              `<option value="${ic}" ${b.icon===ic?'selected':''}>${ic}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Título</label>
          <input type="text" value="${esc(b.title)}" oninput="updateBenefit(${i},'title',this.value)">
        </div>
      </div>
      <div class="field"><label>Descrição</label>
        <input type="text" value="${esc(b.text)}" oninput="updateBenefit(${i},'text',this.value)">
      </div>
    </div>`).join('');
}

function updateBenefit(i, key, val) {
  content.benefits[i][key] = val;
  markDirty();
}
function removeBenefit(i) {
  content.benefits.splice(i, 1);
  renderBenefits();
  markDirty();
}

function renderClasses() {
  const list = document.querySelector('#classes-list');
  list.innerHTML = (content.classes?.items || []).map((cl, i) => `
    <div class="editor-card list-item" id="class-${i}">
      <div class="list-item-header">
        <div class="list-item-label">${esc(cl.name) || 'Modalidade ' + (i+1)}</div>
        <button class="btn btn-danger btn-sm" onclick="removeClass(${i})">Remover</button>
      </div>
      <div class="field-row">
        <div class="field"><label>Nome</label>
          <input type="text" value="${esc(cl.name)}" oninput="updateClass(${i},'name',this.value)">
        </div>
        <div class="field"><label>Descrição</label>
          <input type="text" value="${esc(cl.description)}" oninput="updateClass(${i},'description',this.value)">
        </div>
      </div>
      <div class="field"><label>Imagem (URL)</label>
        <input type="text" value="${esc(cl.image)}" oninput="updateClass(${i},'image',this.value)" placeholder="/assets/images/uploads/…">
      </div>
      <div class="img-upload-zone" style="padding:16px">
        <input type="file" accept="image/*" onchange="uploadClassImg(event,${i})">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        <div class="img-upload-label" style="font-size:.72rem">Upload imagem</div>
      </div>
      ${cl.image ? `<div class="img-preview"><img src="${esc(cl.image)}" alt="${esc(cl.name)}" id="class-img-${i}"></div>` : ''}
    </div>`).join('');
}

function updateClass(i, key, val) {
  content.classes.items[i][key] = val;
  if (key === 'image') {
    const prev = document.querySelector(`#class-img-${i}`);
    if (prev) prev.src = val;
  }
  markDirty();
}
function removeClass(i) {
  content.classes.items.splice(i, 1);
  renderClasses();
  markDirty();
}
window.addClassItem = function() {
  content.classes.items.push({ name: 'Nova Modalidade', description: '', image: '' });
  renderClasses();
  markDirty();
};
async function uploadClassImg(e, i) {
  const file = e.target.files[0];
  if (!file) return;
  const url = await doUpload(file);
  if (url) { content.classes.items[i].image = url; renderClasses(); markDirty(); }
}

function renderStats() {
  const list = document.querySelector('#stats-list');
  list.innerHTML = (content.about?.stats || []).map((s, i) => `
    <div class="schedule-editor-row">
      <div class="field" style="margin-bottom:0">
        <label>Valor</label>
        <input type="text" value="${esc(s.value)}" placeholder="10" oninput="updateStat(${i},'value',this.value)">
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Sufixo / Legenda</label>
        <div style="display:grid;grid-template-columns:60px 1fr;gap:8px">
          <input type="text" value="${esc(s.suffix)}" placeholder="+" oninput="updateStat(${i},'suffix',this.value)">
          <input type="text" value="${esc(s.label)}" placeholder="Anos de Experiência" oninput="updateStat(${i},'label',this.value)">
        </div>
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeStat(${i})">✕</button>
    </div>`).join('');
}

function updateStat(i, key, val) { content.about.stats[i][key] = val; markDirty(); }
function removeStat(i) { content.about.stats.splice(i, 1); renderStats(); markDirty(); }

function renderSchedule() {
  const list = document.querySelector('#schedule-list');
  list.innerHTML = (content.schedule?.days || []).map((d, i) => `
    <div class="schedule-editor-row" style="margin-bottom:8px">
      <div class="field" style="margin-bottom:0">
        <label>Dia(s)</label>
        <input type="text" value="${esc(d.day)}" placeholder="Segunda – Sexta" oninput="updateSchedule(${i},'day',this.value)">
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Horário</label>
        <input type="text" value="${esc(d.hours)}" placeholder="08:00 – 22:00" oninput="updateSchedule(${i},'hours',this.value)">
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeScheduleRow(${i})">✕</button>
    </div>`).join('');
}

function updateSchedule(i, key, val) { content.schedule.days[i][key] = val; markDirty(); }
function removeScheduleRow(i) { content.schedule.days.splice(i, 1); renderSchedule(); markDirty(); }
window.addScheduleRow = function() {
  content.schedule.days.push({ day: '', hours: '' });
  renderSchedule();
  markDirty();
};

/* ─── Save ────────────────────────────────────────────────────────────── */
window.saveContent = async function() {
  const btn = document.querySelector('#save-btn');
  btn.disabled = true;
  btn.textContent = 'A guardar…';
  setSaveStatus('A guardar…', 'saving');

  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify(content),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    dirty = false;
    setSaveStatus('Guardado', 'saved');
    document.querySelector('#last-saved').textContent = 'Guardado às ' + new Date().toLocaleTimeString('pt-PT');
    showToast('✓ Conteúdo guardado com sucesso!');
  } catch (err) {
    setSaveStatus('Erro ao guardar', 'error');
    showToast('Erro: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Alterações';
    btn.insertAdjacentHTML('afterbegin', '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>');
  }
};

/* ─── Image upload ────────────────────────────────────────────────────── */
async function doUpload(file) {
  const fd = new FormData();
  fd.append('image', file);
  try {
    const res  = await fetch('/api/upload', { method: 'POST', headers: { 'x-admin-token': token }, body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('✓ Imagem carregada!');
    loadImages();
    return data.url;
  } catch (err) {
    showToast('Erro ao carregar imagem: ' + err.message, 'error');
    return null;
  }
}

window.uploadImage = async function(e, path, previewId) {
  const file = e.target.files[0];
  if (!file) return;
  const url = await doUpload(file);
  if (url) {
    setPath(content, path, url);
    document.querySelector(`[data-path="${path}"]`).value = url;
    showImgPreview(previewId, url);
    markDirty();
  }
};

function showImgPreview(previewId, url) {
  if (!url) return;
  const prev = document.querySelector('#' + previewId);
  if (!prev) return;
  const img = prev.querySelector('img');
  if (img) img.src = url;
  prev.style.display = '';
  /* Also update any [data-path] input that matches the url field */
}

window.removeImage = function(path, previewId) {
  setPath(content, path, '');
  document.querySelector(`[data-path="${path}"]`).value = '';
  document.querySelector('#' + previewId).style.display = 'none';
  markDirty();
};

window.uploadToLibrary = async function(e) {
  const files = Array.from(e.target.files);
  for (const f of files) await doUpload(f);
};

async function loadImages() {
  try {
    const res  = await fetch('/api/images', { headers: { 'x-admin-token': token } });
    const imgs = await res.json();
    const grid = document.querySelector('#images-grid');
    const cnt  = document.querySelector('#img-count');
    if (cnt) cnt.textContent = imgs.length;
    if (!grid) return;
    grid.innerHTML = imgs.map(img => `
      <div style="position:relative;border-radius:6px;overflow:hidden;background:var(--bg-2);border:1px solid var(--border)">
        <img src="${img.url}" style="width:100%;height:100px;object-fit:cover" loading="lazy">
        <div style="padding:6px 8px">
          <div style="font-size:.65rem;color:var(--text-m);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${img.filename}</div>
          <div style="font-size:.65rem;color:var(--text-m)">${(img.size/1024).toFixed(0)} KB</div>
        </div>
        <button onclick="copyUrl('${img.url}')" style="position:absolute;top:6px;right:6px;width:24px;height:24px;background:rgba(0,0,0,.7);border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:.7rem" title="Copiar URL">⎘</button>
      </div>`).join('');
  } catch {}
}

function copyUrl(url) {
  navigator.clipboard.writeText(url).then(() => showToast('URL copiado!'));
}

/* ─── Sidebar nav ─────────────────────────────────────────────────────── */
function initNav() {
  const items  = document.querySelectorAll('.nav-item[data-section]');
  const titles = {
    geral: 'Informações Gerais', hero: 'Hero', beneficios: 'Benefícios',
    modalidades: 'Modalidades', sobre: 'Sobre / Estatísticas', horarios: 'Horários',
    cta: 'Call to Action', contacto: 'Contacto', footer: 'Rodapé', imagens: 'Imagens',
  };

  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const sec = item.dataset.section;
      document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));
      const target = document.querySelector(`#sec-${sec}`);
      if (target) target.classList.add('active');
      document.querySelector('#topbar-title').textContent = titles[sec] || sec;
    });
  });
}

/* ─── Warn on leave ──────────────────────────────────────────────────── */
window.addEventListener('beforeunload', e => {
  if (dirty) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* ─── Keyboard shortcut Ctrl+S ───────────────────────────────────────── */
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    window.saveContent();
  }
});

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function esc(s) {
  if (!s) return '';
  return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
