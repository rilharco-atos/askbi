/* ─── Versão de cache-busting para assets estáticos ─────────────────────
   Solução simples: calcula uma vez, no arranque, o mtime mais recente
   entre os ficheiros CSS/JS servidos e usa esse timestamp como query
   string (?v=<timestamp>) nas tags <link>/<script> das páginas. Assets
   com hash de conteúdo seriam mais robustos, mas exigiriam um passo de
   build; esta opção funciona sem build step, como o projecto pede. */

const fs = require('fs');
const path = require('path');

const WATCHED_FILES = [
  'assets/css/style.css',
  'assets/css/pages.css',
  'assets/css/dojo.css',
  'assets/css/shoji.css',
  'assets/js/site.js',
  'assets/js/pages.js',
  'assets/js/dojo.js',
];

function computeAssetVersion(rootDir) {
  let latest = 0;
  for (const rel of WATCHED_FILES) {
    const p = path.join(rootDir, rel);
    try {
      const stat = fs.statSync(p);
      if (stat.mtimeMs > latest) latest = stat.mtimeMs;
    } catch { /* ficheiro pode não existir em todos os ambientes */ }
  }
  return String(Math.round(latest) || Date.now());
}

/* Calculado uma vez por arranque do processo (suficiente: cada deploy da
   Vercel arranca uma instância nova e recalcula). */
let _version = null;
function getAssetVersion(rootDir) {
  if (!_version) _version = computeAssetVersion(rootDir);
  return _version;
}

/** Acrescenta ?v=<versao> a hrefs/srcs de assets locais que ainda não têm query string. */
function applyAssetVersion(html, version) {
  return html.replace(
    /(href|src)="(\/assets\/[^"?]+)"/g,
    (match, attr, url) => `${attr}="${url}?v=${version}"`,
  );
}

module.exports = { getAssetVersion, applyAssetVersion, computeAssetVersion };
