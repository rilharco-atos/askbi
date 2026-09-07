/* ─── Leitura, escrita e versionamento do conteúdo (content.json) ──────
   Local (sistema de ficheiros) ou Vercel Blob, consoante
   ASBKI_READ_WRITE_TOKEN. Mantém as últimas VERSION_RETENTION versões,
   cada gravação cria uma versão nova (nunca sobrescreve uma antiga). */

const fs = require('fs');
const path = require('path');
const { client: blob, blobOpts } = require('./blob');
const log = require('./log');

const CONTENT_FILE = path.join(__dirname, '..', 'content.json');
const VERSIONS_DIR = path.join(__dirname, '..', 'cms');
const VERSION_PREFIX_BLOB = 'cms/content-v';
const VERSION_RETENTION = 30;

/* URLs antigas → novos destinos (301) — usadas na migração de âncoras antigas */
const REDIRECTS = {
  '/modalidades': '/karate',
  '/eventos':     '/noticias',
  '/competicoes': '/noticias',
  '/formacoes':   '/noticias',
};

const ANCHOR_MAP = {
  '#inicio': '/', '#beneficios': '/', '#treinar': '/inscricao#horarios',
  '#horarios': '/inscricao#horarios', '#modalidades': '/karate',
  '#sobre': '/associacao', '#inscricao': '/inscricao', '#contacto': '/contacto',
  '#galeria': '/noticias', '#blogue': '/noticias',
};

const SCHEMA_VERSION = 3;
const V2_PLACEHOLDER_DOJOS = new Set(['municipal', 'boidobra', 'teixoso']);

let _defaults = null;
function readDefaults() {
  if (!_defaults) _defaults = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8'));
  return _defaults;
}

/** Preenche chaves em falta com os defaults do repo; o conteúdo gravado ganha. */
function mergeDefaults(def, saved) {
  if (Array.isArray(def)) return Array.isArray(saved) ? saved : def;
  if (def && typeof def === 'object') {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return def;
    const out = { ...saved };
    for (const k of Object.keys(def)) out[k] = mergeDefaults(def[k], saved[k]);
    return out;
  }
  return saved === undefined ? def : saved;
}

function fixHref(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith('#')) return ANCHOR_MAP[v] || '/';
  const base = v.split('#')[0];
  return REDIRECTS[base] ? REDIRECTS[base] + v.slice(base.length) : v;
}

function slugifyServer(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Migra conteúdo gravado em esquemas antigos para o esquema atual. */
function migrate(saved) {
  const defaults = readDefaults();
  const c = mergeDefaults(defaults, saved || {});
  const version = Number(saved?.schemaVersion) || 1;
  if (version < SCHEMA_VERSION) {
    c.nav = defaults.nav;
    for (const k of ['cta1Href', 'cta2Href']) c.hero[k] = fixHref(c.hero[k]);
    c.schedule.viewAllHref = fixHref(c.schedule.viewAllHref);
    c.classes.ctaHref      = fixHref(c.classes.ctaHref);
    c.about.ctaHref        = fixHref(c.about.ctaHref);
    c.trial.ctaHref        = fixHref(c.trial.ctaHref);
    if (c.kids) c.kids.ctaHref = fixHref(c.kids.ctaHref);
    if (Array.isArray(saved?.events)) c.events = defaults.events;
    (c.events.types || []).forEach(t => { t.path = ''; });
    const items = saved?.dojos?.items;
    if (!Array.isArray(items) || items.every(d => V2_PLACEHOLDER_DOJOS.has(d.id))) {
      c.dojos.items = defaults.dojos.items;
      c.schedule.sessions = defaults.schedule.sessions;
    }
    c.dojos.items.forEach(d => { if (!d.slug) d.slug = d.id || slugifyServer(d.name); });
    c.schemaVersion = SCHEMA_VERSION;
  }
  return c;
}

/* ─── Cache em memória de 60s para a injeção de conteúdo no HTML ───────── */
let _cache = null; /* { data, expiresAt } */
const CACHE_TTL_MS = 60 * 1000;

function invalidateCache() { _cache = null; }

async function readContentRaw() {
  if (blob) {
    const { blobs } = await blob.list(blobOpts({ prefix: VERSION_PREFIX_BLOB }));
    if (blobs.length) {
      const latest = blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
      const r = await fetch(latest.url);
      return migrate(await r.json());
    }
  }
  return migrate(JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf-8')));
}

/** Lê o conteúdo atual (com cache de 60s, invalidada em cada gravação). */
async function readContent() {
  const now = Date.now();
  if (_cache && _cache.expiresAt > now) return _cache.data;
  const data = await readContentRaw();
  _cache = { data, expiresAt: now + CACHE_TTL_MS };
  return data;
}

function localVersionPath(id) {
  return path.join(VERSIONS_DIR, `content-v${id}.json`);
}

function pruneLocalVersions() {
  if (!fs.existsSync(VERSIONS_DIR)) return;
  const files = fs.readdirSync(VERSIONS_DIR)
    .filter(f => /^content-v\d+\.json$/.test(f))
    .sort().reverse();
  files.slice(VERSION_RETENTION).forEach(f => {
    try { fs.unlinkSync(path.join(VERSIONS_DIR, f)); } catch { /* já não existe */ }
  });
}

async function pruneBlobVersions() {
  const { blobs: all } = await blob.list(blobOpts({ prefix: VERSION_PREFIX_BLOB }));
  const sorted = all.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  await Promise.all(sorted.slice(VERSION_RETENTION).map(b => blob.del(b.url, blobOpts())));
}

/** Grava o conteúdo como a versão atual e cria uma nova entrada no histórico. */
async function writeContent(data) {
  data.schemaVersion = SCHEMA_VERSION;
  const json = JSON.stringify(data, null, 2);
  const id = String(Date.now());

  if (blob) {
    await blob.put(`${VERSION_PREFIX_BLOB}${id}.json`, json, blobOpts({
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    }));
    await pruneBlobVersions();
  } else {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
    fs.writeFileSync(localVersionPath(id), json, 'utf-8');
    fs.writeFileSync(CONTENT_FILE, json, 'utf-8');
    _defaults = null;
    pruneLocalVersions();
  }

  invalidateCache();
  log.info('content.saved', { versionId: id, mode: blob ? 'blob' : 'local' });
  return id;
}

/** Lista as versões guardadas, mais recente primeiro. */
async function listVersions() {
  if (blob) {
    const { blobs } = await blob.list(blobOpts({ prefix: VERSION_PREFIX_BLOB }));
    return blobs
      .map(b => ({
        id: path.basename(b.pathname).replace(/^content-v/, '').replace(/\.json$/, ''),
        savedAt: b.uploadedAt,
        size: b.size,
      }))
      .sort((a, b) => Number(b.id) - Number(a.id));
  }
  if (!fs.existsSync(VERSIONS_DIR)) return [];
  return fs.readdirSync(VERSIONS_DIR)
    .filter(f => /^content-v\d+\.json$/.test(f))
    .map(f => {
      const id = f.replace(/^content-v/, '').replace(/\.json$/, '');
      const stat = fs.statSync(path.join(VERSIONS_DIR, f));
      return { id, savedAt: new Date(Number(id)).toISOString(), size: stat.size };
    })
    .sort((a, b) => Number(b.id) - Number(a.id));
}

/** Lê o conteúdo bruto de uma versão específica (sem migração), para restauro. */
async function readVersion(id) {
  if (!/^\d+$/.test(String(id))) throw new Error('Identificador de versão inválido');
  if (blob) {
    const { blobs } = await blob.list(blobOpts({ prefix: `${VERSION_PREFIX_BLOB}${id}` }));
    const match = blobs.find(b => b.pathname === `${VERSION_PREFIX_BLOB}${id}.json`);
    if (!match) return null;
    const r = await fetch(match.url);
    return r.json();
  }
  const file = localVersionPath(id);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

/** Restaura uma versão antiga: cria uma NOVA versão com esses dados (não apaga histórico). */
async function restoreVersion(id) {
  const data = await readVersion(id);
  if (!data) return null;
  const newId = await writeContent(data);
  return { id: newId, restoredFrom: String(id) };
}

module.exports = {
  readContent, writeContent, migrate, invalidateCache,
  listVersions, restoreVersion, readVersion,
  REDIRECTS, SCHEMA_VERSION,
};
