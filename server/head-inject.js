/* ─── Injeção de <head>: conteúdo, metadados, JSON-LD, ícones, analytics ─
   Faz substituição de texto sobre o HTML servido (sem parser de DOM):
   remove title/description/OG/twitter/canonical existentes e insere o
   bloco novo antes de </head>. Mantém tudo o resto do <head> intocado. */

const { escapeHtml } = require('./meta');

/** Remove as tags que vamos substituir, para não ficarem duplicadas. */
function stripExistingMeta(html) {
  return html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+property=["']og:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']+["'][^>]*>\s*/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '');
}

/** JSON embutido em <script type="application/json">, escapando "</" para não fechar a tag. */
function jsonScriptTag(id, data) {
  const json = JSON.stringify(data).replace(/<\//g, '<\\/');
  return `<script id="${id}" type="application/json">${json}</script>`;
}

/**
 * Constrói o bloco de tags a inserir no <head>.
 * @param {object} opts
 * @param {object} opts.meta resultado de resolveRouteMeta
 * @param {object} opts.content conteúdo actual completo (para o bloco #asbki-content)
 * @param {string} [opts.iconsHtml] tags de favicon/apple-touch-icon/manifest
 * @param {string} [opts.plausibleHtml] script do Plausible, quando activo
 * @param {string} [opts.assetVersion] query string de cache-busting, ex. "?v=123"
 */
function buildHeadBlock({ meta, content, iconsHtml = '', plausibleHtml = '', assetVersion = '' }) {
  const parts = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  parts.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}">`);
  parts.push(`<meta property="og:type" content="${escapeHtml(meta.ogType)}">`);
  parts.push(`<meta property="og:title" content="${escapeHtml(meta.ogTitle)}">`);
  parts.push(`<meta property="og:description" content="${escapeHtml(meta.ogDescription)}">`);
  parts.push(`<meta property="og:image" content="${escapeHtml(meta.ogImage)}">`);
  parts.push(`<meta property="og:url" content="${escapeHtml(meta.canonical)}">`);
  parts.push('<meta name="twitter:card" content="summary_large_image">');
  parts.push(`<meta name="twitter:title" content="${escapeHtml(meta.ogTitle)}">`);
  parts.push(`<meta name="twitter:description" content="${escapeHtml(meta.ogDescription)}">`);
  parts.push(`<meta name="twitter:image" content="${escapeHtml(meta.ogImage)}">`);
  for (const node of meta.jsonLd) parts.push(jsonScriptTag(`asbki-jsonld-${node['@type']}`.toLowerCase(), node));
  if (iconsHtml) parts.push(iconsHtml);
  if (plausibleHtml) parts.push(plausibleHtml);
  parts.push(jsonScriptTag('asbki-content', content));
  if (assetVersion) parts.push(`<meta name="asbki-asset-version" content="${escapeHtml(assetVersion)}">`);
  return parts.join('\n  ');
}

/**
 * Aplica a injeção de <head> a uma página HTML já lida em memória.
 * @param {string} html HTML original do ficheiro
 * @param {object} blockOpts ver buildHeadBlock
 * @returns {string} HTML com o <head> actualizado
 */
function injectHead(html, blockOpts) {
  const block = buildHeadBlock(blockOpts);
  const stripped = stripExistingMeta(html);
  if (!stripped.includes('</head>')) return stripped; /* nunca deve acontecer nas nossas páginas */
  return stripped.replace('</head>', `  ${block}\n</head>`);
}

/**
 * Injecção "leve" para páginas de erro (404/500/503): mantém o title/description/
 * robots já escritos no ficheiro (não deve ser indexado, não precisa de OG nem
 * JSON-LD) e só acrescenta o bloco de conteúdo, ícones, versão de assets e
 * analytics — o suficiente para o header/footer (site.js) funcionarem.
 * @param {string} html
 * @param {object} opts
 * @param {object} opts.content
 * @param {string} [opts.iconsHtml]
 * @param {string} [opts.plausibleHtml]
 * @param {string} [opts.assetVersion]
 */
function injectContentOnly(html, { content, iconsHtml = '', plausibleHtml = '', assetVersion = '' }) {
  const parts = [];
  if (iconsHtml) parts.push(iconsHtml);
  if (plausibleHtml) parts.push(plausibleHtml);
  parts.push(jsonScriptTag('asbki-content', content));
  if (assetVersion) parts.push(`<meta name="asbki-asset-version" content="${escapeHtml(assetVersion)}">`);
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', `  ${parts.join('\n  ')}\n</head>`);
}

module.exports = { injectHead, injectContentOnly, buildHeadBlock, stripExistingMeta };
