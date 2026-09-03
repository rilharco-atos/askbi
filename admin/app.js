/* ─── ASBKI CMS Admin App ─────────────────────────────────────────────── */
/* Editores genéricos: [data-path] (escalar), [data-lines] (lista de linhas),
   .img-field[data-img] (imagem) e listEditor() para listas de objetos.     */

let token   = localStorage.getItem('cms_token') || '';
let content = {};
let dirty   = false;

/* ─── Utils ──────────────────────────────────────────────────────────── */
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let parent = obj;
  for (const k of keys) {
    if (parent[k] == null) parent[k] = /^\d+$/.test(k) ? [] : {};
    parent = parent[k];
  }
  parent[last] = value;
}
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function slugify(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function uid(prefix) { return prefix + Date.now().toString(36).slice(-5); }

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
  el.textContent = text;
  el.className = `save-status ${type}`;
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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
  initSidebar();
  loadImages();
}

if (token) {
  fetch('/api/images', { headers: { 'x-admin-token': token } })
    .then(r => r.ok ? bootApp() : (localStorage.removeItem('cms_token'), token = ''))
    .catch(() => {});
}

/* ─── Load content ────────────────────────────────────────────────────── */
async function loadContent() {
  try {
    const res = await fetch('/api/content?v=' + Date.now());
    content   = await res.json();
    renderAll();
    dirty = false;
    setSaveStatus('', '');
    document.querySelector('#last-saved').textContent = 'Carregado às ' + new Date().toLocaleTimeString('pt-PT');
  } catch {
    showToast('Erro ao carregar conteúdo', 'error');
  }
}

function renderAll() {
  populateScalars();
  populateLines();
  renderImgFields();
  populateFighterControls();
  Object.values(EDITORS).forEach(fn => fn());
}

/* ─── [data-path] escalares ───────────────────────────────────────────── */
function populateScalars() {
  document.querySelectorAll('[data-path]').forEach(el => {
    const val = getPath(content, el.dataset.path);
    el.value = val ?? '';
  });
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.path) { setPath(content, el.dataset.path, el.type === 'number' ? Number(el.value) : el.value); markDirty(); }
  if (el.dataset.lines) { setPath(content, el.dataset.lines, el.value.split('\n').map(l => l.trim()).filter(Boolean)); markDirty(); }
  if (el.dataset.bind) { onBindInput(el); }
});

/* ─── [data-lines] listas de texto (uma por linha) ────────────────────── */
function populateLines() {
  document.querySelectorAll('[data-lines]').forEach(el => {
    const val = getPath(content, el.dataset.lines);
    el.value = Array.isArray(val) ? val.join('\n') : '';
  });
}

/* ─── .img-field[data-img] — imagem com upload e pré-visualização ─────── */
const UPLOAD_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';

function imgFieldHTML(path, label, help) {
  const url = getPath(content, path) || '';
  return `
    <div class="field" style="margin-bottom:8px"><label>${esc(label || 'Imagem (URL)')}</label>
      <input type="text" data-path="${esc(path)}" value="${esc(url)}" placeholder="/assets/images/uploads/…"></div>
    ${help ? `<p class="help">${help}</p>` : ''}
    <div class="img-row">
      <label class="img-upload-zone compact">
        <input type="file" accept="image/*,.svg" data-upload="${esc(path)}">
        ${UPLOAD_SVG}<span class="img-upload-label">Carregar imagem</span>
      </label>
      <div class="img-thumb" data-thumb="${esc(path)}" ${url ? '' : 'hidden'}>
        <img src="${esc(url)}" alt="">
        <button type="button" class="img-preview-remove" data-clear="${esc(path)}" title="Remover">✕</button>
      </div>
    </div>`;
}
function renderImgFields() {
  document.querySelectorAll('.img-field[data-img]').forEach(el => {
    el.innerHTML = imgFieldHTML(el.dataset.img, el.dataset.label, el.dataset.help);
  });
}
function refreshThumb(path) {
  const url = getPath(content, path) || '';
  document.querySelectorAll(`[data-thumb="${path}"]`).forEach(t => {
    t.hidden = !url;
    const img = t.querySelector('img'); if (img) img.src = url;
  });
  document.querySelectorAll(`[data-path="${path}"]`).forEach(i => { if (i.value !== url) i.value = url; });
  if (path === 'hero.foregroundImage') refreshFighterPreview();
}
document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.upload !== undefined && el.files?.[0]) {
    const url = await doUpload(el.files[0]);
    if (url) { setPath(content, el.dataset.upload, url); refreshThumb(el.dataset.upload); markDirty(); }
    el.value = '';
  }
  if (el.dataset.path && /image|logo|Image/.test(el.dataset.path)) refreshThumb(el.dataset.path);
});
document.addEventListener('click', e => {
  const clr = e.target.closest('[data-clear]');
  if (clr) { setPath(content, clr.dataset.clear, ''); refreshThumb(clr.dataset.clear); markDirty(); }
});

/* ─── Controlo do lutador (hero) ──────────────────────────────────────── */
function populateFighterControls() {
  const size = content.hero?.fighterSize ?? 88, offset = content.hero?.fighterOffset ?? 0;
  const sEl = document.getElementById('fighter-size-input'), oEl = document.getElementById('fighter-offset-input');
  if (!sEl || !oEl) return;
  sEl.value = size; oEl.value = offset;
  document.getElementById('fighter-size-val').textContent   = size;
  document.getElementById('fighter-offset-val').textContent = (offset > 0 ? '+' : '') + offset;
  refreshFighterPreview();
}
window.updateFighterControls = function () {
  const size = parseInt(document.getElementById('fighter-size-input').value);
  const offset = parseInt(document.getElementById('fighter-offset-input').value);
  document.getElementById('fighter-size-val').textContent   = size;
  document.getElementById('fighter-offset-val').textContent = (offset > 0 ? '+' : '') + offset;
  setPath(content, 'hero.fighterSize', size);
  setPath(content, 'hero.fighterOffset', offset);
  markDirty();
  refreshFighterPreview();
};
function refreshFighterPreview() {
  const img = document.getElementById('fighter-preview-img');
  if (!img) return;
  const url = content.hero?.foregroundImage;
  if (url) {
    img.src = url; img.style.display = '';
    img.style.height = (content.hero?.fighterSize ?? 88) + '%';
    img.style.right  = (-(content.hero?.fighterOffset ?? 0)) + 'px';
  } else img.style.display = 'none';
}

/* ─── Editor genérico de listas ───────────────────────────────────────── */
/* schema: { title(item,i), newItem(), fields: [{ key, label, type, options, placeholder, full, help }] }
   types: text | textarea | select | date | number | image | lines | sublist  */
const EDITORS = {};

function fieldHTML(base, item, f) {
  const path = `${base}.${f.key}`;
  const val = item[f.key];
  const attrs = `data-bind="${esc(path)}" placeholder="${esc(f.placeholder || '')}"`;
  switch (f.type) {
    case 'textarea':
      return `<div class="field ${f.full !== false ? 'full' : ''}"><label>${esc(f.label)}</label><textarea ${attrs} style="min-height:${f.rows ? f.rows * 22 : 70}px">${esc(val)}</textarea>${f.help ? `<p class="help">${f.help}</p>` : ''}</div>`;
    case 'select': {
      const opts = typeof f.options === 'function' ? f.options() : f.options;
      const has = opts.some(o => (o.value ?? o) === val);
      return `<div class="field"><label>${esc(f.label)}</label><select ${attrs}>
        ${!has && val ? `<option value="${esc(val)}" selected>${esc(val)}</option>` : ''}
        ${opts.map(o => { const v = o.value ?? o, l = o.label ?? o; return `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}
      </select></div>`;
    }
    case 'date':   return `<div class="field"><label>${esc(f.label)}</label><input type="date" ${attrs} value="${esc(val)}"></div>`;
    case 'number': return `<div class="field"><label>${esc(f.label)}</label><input type="number" ${attrs} value="${esc(val)}"></div>`;
    case 'lines':  return `<div class="field full"><label>${esc(f.label)}</label><textarea data-bind="${esc(path)}" data-kind="lines" style="min-height:90px" placeholder="${esc(f.placeholder || 'Uma por linha')}">${esc(Array.isArray(val) ? val.join('\n') : '')}</textarea>${f.help ? `<p class="help">${f.help}</p>` : ''}</div>`;
    case 'image':  return `<div class="field full img-inline">${imgFieldHTML(path, f.label, f.help)}</div>`;
    case 'sublist': {
      const arr = Array.isArray(val) ? val : [];
      return `<div class="field full"><label>${esc(f.label)}</label>
        <div class="sublist" data-sublist="${esc(path)}">
          ${arr.map((sub, j) => `
            <div class="sublist-row">
              ${f.fields.map(sf => `<input type="text" data-bind="${esc(path)}.${j}.${sf.key}" value="${esc(sub[sf.key])}" placeholder="${esc(sf.placeholder || sf.label)}" title="${esc(sf.label)}">`).join('')}
              <button type="button" class="btn btn-sm btn-secondary" data-act="up"     data-list="${esc(path)}" data-index="${j}" title="Subir">↑</button>
              <button type="button" class="btn btn-sm btn-secondary" data-act="down"   data-list="${esc(path)}" data-index="${j}" title="Descer">↓</button>
              <button type="button" class="btn btn-sm btn-danger"    data-act="remove" data-list="${esc(path)}" data-index="${j}" title="Remover">✕</button>
            </div>`).join('')}
          <button type="button" class="btn btn-sm btn-secondary" data-act="add" data-list="${esc(path)}" data-new='${esc(JSON.stringify(f.newItem || {}))}'>+ ${esc(f.addLabel || 'Adicionar')}</button>
        </div></div>`;
    }
    default:
      return `<div class="field"><label>${esc(f.label)}</label><input type="text" ${attrs} value="${esc(val)}">${f.help ? `<p class="help">${f.help}</p>` : ''}</div>`;
  }
}

function listEditor(mountSel, path, schema) {
  const render = () => {
    const mount = document.querySelector(mountSel);
    if (!mount) return;
    let arr = getPath(content, path);
    if (!Array.isArray(arr)) { arr = []; setPath(content, path, arr); }
    mount.innerHTML = arr.map((item, i) => {
      const base = `${path}.${i}`;
      return `
        <div class="editor-card list-item" data-item="${esc(base)}">
          <div class="list-item-header">
            <div class="list-item-label">${esc(schema.title ? schema.title(item, i) : `Item ${i + 1}`)}</div>
            <div class="list-item-actions">
              <button type="button" class="btn btn-sm btn-secondary" data-act="up"     data-list="${esc(path)}" data-index="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="btn btn-sm btn-secondary" data-act="down"   data-list="${esc(path)}" data-index="${i}" ${i === arr.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="btn btn-sm btn-danger"    data-act="remove" data-list="${esc(path)}" data-index="${i}">Remover</button>
            </div>
          </div>
          <div class="field-grid">${schema.fields.map(f => fieldHTML(base, item, f)).join('')}</div>
        </div>`;
    }).join('') + `
      <button type="button" class="btn btn-secondary" data-act="add" data-list="${esc(path)}" data-new-fn="${esc(mountSel)}">+ ${esc(schema.addLabel || 'Adicionar')}</button>`;
  };
  EDITORS[mountSel] = render;
  EDITORS[mountSel].schema = schema;
  EDITORS[mountSel].path = path;
}

function onBindInput(el) {
  const path = el.dataset.bind;
  let v = el.value;
  if (el.dataset.kind === 'lines') v = v.split('\n').map(l => l.trim()).filter(Boolean);
  else if (el.type === 'number') v = Number(v);
  setPath(content, path, v);
  markDirty();
  /* Atualiza o título do cartão sem re-renderizar (mantém o foco) */
  const card = el.closest('.list-item');
  if (card) {
    const ed = Object.values(EDITORS).find(fn => card.dataset.item.startsWith(fn.path + '.'));
    if (ed && ed.schema.title) {
      const idx = Number(card.dataset.item.slice(ed.path.length + 1).split('.')[0]);
      const lbl = card.querySelector('.list-item-label');
      if (lbl) lbl.textContent = ed.schema.title(getPath(content, ed.path)[idx], idx);
    }
  }
}

/* Ações estruturais: add / remove / up / down (listas e sublistas) */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const path = btn.dataset.list;
  let arr = getPath(content, path);
  if (!Array.isArray(arr)) { arr = []; setPath(content, path, arr); }
  const i = Number(btn.dataset.index);
  switch (btn.dataset.act) {
    case 'add': {
      const ed = btn.dataset.newFn ? EDITORS[btn.dataset.newFn] : null;
      const item = ed?.schema.newItem ? ed.schema.newItem() : JSON.parse(btn.dataset.new || '{}');
      arr.push(item);
      break;
    }
    case 'remove':
      if (!confirm('Remover este item?')) return;
      arr.splice(i, 1); break;
    case 'up':   if (i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; break;
    case 'down': if (i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; break;
  }
  markDirty();
  /* Re-render do editor de topo que contém este caminho */
  const top = Object.values(EDITORS).find(fn => path === fn.path || path.startsWith(fn.path + '.'));
  if (top) top(); else renderAll();
});

/* ─── Definição dos editores ──────────────────────────────────────────── */
const STATUS_OPTS = [{ value: 'open', label: 'Vagas abertas' }, { value: 'waitlist', label: 'Lista de espera' }, { value: 'full', label: 'Cheio' }];
const ICON_OPTS   = ['shield', 'lock', 'dumbbell', 'target'];
const groupOpts   = () => (content.schedule?.filters || []).map(f => ({ value: f.key, label: f.label }));
const dojoOpts    = () => (content.dojos?.items || []).map(d => d.name);
const typeOpts    = () => (content.events?.types || []).map(t => ({ value: t.key, label: t.label }));
const catOpts     = () => (content.news?.categories || []).map(k => ({ value: k.key, label: k.label }));

/* Geral: menu */
listEditor('#nav-links-list', 'nav.links', {
  title: l => l.label || 'Novo item',
  addLabel: 'Adicionar item ao menu',
  newItem: () => ({ label: 'Novo item', href: '/', children: [] }),
  fields: [
    { key: 'label', label: 'Texto', placeholder: 'Dojos' },
    { key: 'href',  label: 'Link',  placeholder: '/dojos', help: 'Páginas: / · /associacao · /associacao/historia · /associacao/instrutores · /associacao/orgaos-sociais · /associacao/dojo-kun · /karate · /karate/kihon · /karate/kata · /karate/kumite · /dojos · /dojos/&lt;slug&gt; · /noticias · /contacto · /inscricao. Máximo dois níveis.' },
    { key: 'children', label: 'Submenu (dropdown)', type: 'sublist', addLabel: 'Adicionar ao submenu',
      newItem: { label: 'Novo', href: '/' }, fields: [{ key: 'label', label: 'Texto' }, { key: 'href', label: 'Link' }] },
  ],
});

/* Início */
listEditor('#benefits-list', 'benefits', {
  title: b => b.title || 'Benefício', addLabel: 'Adicionar benefício',
  newItem: () => ({ icon: 'shield', title: '', text: '' }),
  fields: [
    { key: 'icon', label: 'Ícone', type: 'select', options: ICON_OPTS },
    { key: 'title', label: 'Título' },
    { key: 'text', label: 'Descrição', type: 'textarea' },
  ],
});

/* Horários */
listEditor('#filters-list', 'schedule.filters', {
  title: f => f.label || 'Faixa', addLabel: 'Adicionar faixa etária',
  newItem: () => ({ key: uid('g'), label: '' }),
  fields: [{ key: 'label', label: 'Nome (ex: 5–9 anos)' }, { key: 'key', label: 'Chave interna', help: 'Não mudar depois de criar turmas.' }],
});
listEditor('#sessions-list', 'schedule.sessions', {
  title: s => `${s.label || 'Turma'} · ${s.daysShort || ''} ${s.time || ''}`, addLabel: 'Adicionar turma',
  newItem: () => ({ id: uid('s'), group: content.schedule?.filters?.[0]?.key || '', daysShort: '', time: '', label: '', location: content.dojos?.items?.[0]?.name || '', slotsText: 'Vagas', status: 'open' }),
  fields: [
    { key: 'label', label: 'Nome da turma', placeholder: 'Infantis 5–9 anos' },
    { key: 'group', label: 'Faixa etária', type: 'select', options: groupOpts },
    { key: 'daysShort', label: 'Dias', placeholder: 'SEG · QUA · SEX' },
    { key: 'time', label: 'Hora', placeholder: '18:00 – 19:00' },
    { key: 'location', label: 'Dojo', type: 'select', options: dojoOpts, help: 'Tem de coincidir com o nome do dojo para aparecer na página Dojos.' },
    { key: 'slotsText', label: 'Vagas (texto)', placeholder: '4 vagas' },
    { key: 'status', label: 'Estado', type: 'select', options: STATUS_OPTS },
  ],
});
listEditor('#days-list', 'schedule.days', {
  title: d => d.day || 'Dia', addLabel: 'Adicionar linha',
  newItem: () => ({ day: '', hours: '' }),
  fields: [{ key: 'day', label: 'Dia(s)', placeholder: 'Segunda – Sexta' }, { key: 'hours', label: 'Horário', placeholder: '18:00 – 21:30' }],
});

/* Dojos */
listEditor('#dojos-list', 'dojos.items', {
  title: d => d.name || 'Dojo', addLabel: 'Adicionar dojo',
  newItem: () => ({ id: uid('d'), slug: '', name: '', short: '', address: '', phone: '', email: '', mapUrl: '', image: '', notes: '', intro: '' }),
  fields: [
    { key: 'name', label: 'Nome completo', placeholder: 'Dojo Covilhã' },
    { key: 'short', label: 'Nome curto (menu)', placeholder: 'Covilhã' },
    { key: 'slug', label: 'Endereço (slug)', placeholder: 'gerado automaticamente', help: 'Fica em /dojos/&lt;slug&gt;. Usa este link no submenu "Dojos".' },
    { key: 'address', label: 'Morada' },
    { key: 'phone', label: 'Telefone' }, { key: 'email', label: 'E-mail' },
    { key: 'mapUrl', label: 'Link do mapa (Google Maps)', placeholder: 'https://maps.google.com/?q=…' },
    { key: 'notes', label: 'Nota curta (cartão)', placeholder: 'Turmas infantis e adultos.' },
    { key: 'intro', label: 'Apresentação (página do dojo)', type: 'textarea' },
    { key: 'image', label: 'Fotografia', type: 'image' },
  ],
});

/* Karate: disciplinas */
listEditor('#disciplines-list', 'karate.disciplines', {
  title: d => d.name || 'Disciplina', addLabel: 'Adicionar disciplina',
  newItem: () => ({ slug: '', name: '', jp: '', kicker: '', excerpt: '', intro: '', body: '', points: [], image: '' }),
  fields: [
    { key: 'name', label: 'Nome', placeholder: 'Kihon' },
    { key: 'slug', label: 'Endereço (slug)', placeholder: 'gerado automaticamente', help: 'Fica em /karate/&lt;slug&gt;.' },
    { key: 'jp', label: 'Kanji', placeholder: '基本' },
    { key: 'kicker', label: 'Etiqueta curta', placeholder: 'A base' },
    { key: 'excerpt', label: 'Resumo (cartão)', type: 'textarea' },
    { key: 'intro', label: 'Introdução (cabeçalho da página)', type: 'textarea' },
    { key: 'body', label: 'Texto da página', type: 'textarea', rows: 12, help: 'Parágrafos separados por linha em branco. <code>## Título</code>, <code>- item</code>, <code>**negrito**</code>.' },
    { key: 'points', label: 'Conceitos-chave (coluna lateral)', type: 'sublist', addLabel: 'Adicionar conceito', newItem: { title: '', text: '' },
      fields: [{ key: 'title', label: 'Termo', placeholder: 'Kime' }, { key: 'text', label: 'Explicação curta' }] },
    { key: 'image', label: 'Imagem', type: 'image' },
  ],
});

/* Turmas (cartões na home e em /karate) */
listEditor('#classes-list', 'classes.items', {
  title: c => c.name || 'Turma', addLabel: 'Adicionar turma',
  newItem: () => ({ name: '', description: '', image: '' }),
  fields: [{ key: 'name', label: 'Nome' }, { key: 'description', label: 'Descrição', type: 'textarea' }, { key: 'image', label: 'Imagem', type: 'image' }],
});

/* Associação */
listEditor('#stats-list', 'about.stats', {
  title: s => s.label || 'Estatística', addLabel: 'Adicionar estatística',
  newItem: () => ({ value: '0', suffix: '', label: '' }),
  fields: [{ key: 'value', label: 'Valor', placeholder: '300' }, { key: 'suffix', label: 'Sufixo', placeholder: '+' }, { key: 'label', label: 'Legenda' }],
});
listEditor('#timeline-list', 'history.timeline', {
  title: t => `${t.year || '—'} · ${t.title || ''}`, addLabel: 'Adicionar marco',
  newItem: () => ({ year: '', title: '', text: '' }),
  fields: [{ key: 'year', label: 'Ano' }, { key: 'title', label: 'Título' }, { key: 'text', label: 'Texto', type: 'textarea' }],
});
listEditor('#board-list', 'board.groups', {
  title: g => g.name || 'Órgão', addLabel: 'Adicionar órgão',
  newItem: () => ({ name: '', members: [] }),
  fields: [
    { key: 'name', label: 'Nome do órgão', placeholder: 'Direção' },
    { key: 'members', label: 'Membros', type: 'sublist', addLabel: 'Adicionar membro', newItem: { role: '', name: '' },
      fields: [{ key: 'role', label: 'Cargo', placeholder: 'Presidente' }, { key: 'name', label: 'Nome' }] },
  ],
});
listEditor('#instructors-list', 'instructors.items', {
  title: p => p.name || 'Instrutor', addLabel: 'Adicionar instrutor',
  newItem: () => ({ name: '', grade: '', role: '', bio: '', image: '' }),
  fields: [
    { key: 'name', label: 'Nome' }, { key: 'grade', label: 'Graduação', placeholder: '3.º Dan' },
    { key: 'role', label: 'Função', placeholder: 'Instrutor · Adultos' },
    { key: 'bio', label: 'Biografia curta', type: 'textarea' },
    { key: 'image', label: 'Fotografia', type: 'image' },
  ],
});
listEditor('#kun-list', 'dojoKun.principles', {
  title: (p, i) => `${i + 1}. ${p.pt || ''}`, addLabel: 'Adicionar preceito',
  newItem: () => ({ jp: '', pt: '', text: '' }),
  fields: [{ key: 'jp', label: 'Japonês (romaji)' }, { key: 'pt', label: 'Português' }, { key: 'text', label: 'Explicação curta', type: 'textarea' }],
});

/* Notícias */
listEditor('#news-cats-list', 'news.categories', {
  title: k => k.label || 'Categoria', addLabel: 'Adicionar categoria',
  newItem: () => ({ key: uid('c'), label: '' }),
  fields: [{ key: 'label', label: 'Nome' }, { key: 'key', label: 'Chave interna' }],
});
listEditor('#news-list', 'news.items', {
  title: n => `${n.date || '—'} · ${n.title || 'Sem título'}`, addLabel: 'Novo artigo',
  newItem: () => ({ slug: '', title: '', category: content.news?.categories?.[0]?.key || '', date: new Date().toISOString().slice(0, 10), author: content.site?.name || '', excerpt: '', image: '', body: '' }),
  fields: [
    { key: 'title', label: 'Título' },
    { key: 'slug', label: 'Endereço (slug)', placeholder: 'gerado automaticamente', help: 'Fica em /noticias/<slug>. Deixa vazio para gerar a partir do título.' },
    { key: 'category', label: 'Categoria', type: 'select', options: catOpts },
    { key: 'date', label: 'Data', type: 'date' },
    { key: 'author', label: 'Autor' },
    { key: 'excerpt', label: 'Resumo (aparece nos cartões)', type: 'textarea' },
    { key: 'body', label: 'Texto do artigo', type: 'textarea', rows: 14, help: 'Parágrafos separados por linha em branco. <code>## Título</code> para subtítulos, <code>- item</code> para listas, <code>**negrito**</code>.' },
    { key: 'image', label: 'Imagem de capa', type: 'image' },
  ],
});

/* Eventos */
listEditor('#event-types-list', 'events.types', {
  title: t => t.label || 'Tipo', addLabel: 'Adicionar tipo',
  newItem: () => ({ key: uid('t'), label: '' }),
  fields: [{ key: 'label', label: 'Nome' }, { key: 'key', label: 'Chave interna' }],
});
listEditor('#events-list', 'events.items', {
  title: e => `${e.date || '—'} · ${e.title || 'Sem título'}`, addLabel: 'Adicionar evento',
  newItem: () => ({ id: uid('e'), date: '', title: '', type: content.events?.types?.[0]?.key || '', location: '', description: '', link: '' }),
  fields: [
    { key: 'title', label: 'Título' }, { key: 'date', label: 'Data', type: 'date' },
    { key: 'type', label: 'Tipo', type: 'select', options: typeOpts },
    { key: 'location', label: 'Local' },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'link', label: 'Link externo (opcional)', placeholder: 'https://…' },
  ],
});

/* ─── Save ────────────────────────────────────────────────────────────── */
function prepareForSave() {
  (content.news?.items || []).forEach(n => { if (!n.slug) n.slug = slugify(n.title); });
  (content.events?.items || []).forEach(e => { if (!e.id) e.id = uid('e'); });
  (content.schedule?.sessions || []).forEach(s => { if (!s.id) s.id = uid('s'); });
  (content.dojos?.items || []).forEach(d => {
    if (!d.id) d.id = slugify(d.name) || uid('d');
    if (!d.slug) d.slug = slugify(d.short || d.name) || d.id;
  });
  (content.karate?.disciplines || []).forEach(d => { if (!d.slug) d.slug = slugify(d.name); });
}

window.saveContent = async function () {
  const btn = document.querySelector('#save-btn');
  btn.disabled = true;
  btn.textContent = 'A guardar…';
  setSaveStatus('A guardar…', 'saving');
  try {
    prepareForSave();
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
    renderAll();
  } catch (err) {
    setSaveStatus('Erro ao guardar', 'error');
    showToast('Erro: ' + err.message, 'error');
    if (/autorizado/i.test(err.message)) { localStorage.removeItem('cms_token'); }
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar Alterações';
  }
};

/* ─── Image upload / biblioteca ───────────────────────────────────────── */
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

window.uploadToLibrary = async function (e) {
  for (const f of Array.from(e.target.files)) await doUpload(f);
  e.target.value = '';
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
      <div class="lib-item">
        <div class="lib-thumb" style="background:${img.filename.endsWith('.svg') ? '#fff' : 'transparent'}">
          <img src="${esc(img.url)}" loading="lazy" alt="">
        </div>
        <div class="lib-meta">
          <div class="lib-name" title="${esc(img.filename)}">${esc(img.filename)}</div>
          <div class="lib-size">${(img.size / 1024).toFixed(0)} KB${img.deletable === false ? ' · fixo' : ''}</div>
        </div>
        <button type="button" class="lib-copy" onclick="copyUrl('${esc(img.url)}')" title="Copiar URL">⎘</button>
      </div>`).join('');
  } catch {}
}

window.copyUrl = function (url) {
  navigator.clipboard.writeText(url).then(() => showToast('URL copiado!'));
};

/* ─── Sidebar ─────────────────────────────────────────────────────────── */
function initSidebar() {
  const items = document.querySelectorAll('.nav-item[data-section]');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      const sec = item.dataset.section;
      document.querySelectorAll('.editor-section').forEach(s => s.classList.remove('active'));
      const target = document.querySelector(`#sec-${sec}`);
      if (target) target.classList.add('active');
      document.querySelector('#topbar-title').textContent = item.dataset.title || item.textContent.trim();
      document.querySelector('#content-area').scrollTop = 0;
    });
  });
}

/* ─── Warn on leave / Ctrl+S ──────────────────────────────────────────── */
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); window.saveContent(); }
});
