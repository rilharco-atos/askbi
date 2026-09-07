/* ─── sitemap.xml e robots.txt ──────────────────────────────────────────
   O sitemap cobre as rotas estáticas (PAGES) e os slugs dinâmicos de
   notícias, dojos e disciplinas de karate, lidos do conteúdo actual. */

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Gera o XML do sitemap.
 * @param {string[]} staticPaths caminhos estáticos (chaves de PAGES)
 * @param {object} content conteúdo actual (para slugs dinâmicos)
 * @param {string} siteUrl base pública do site
 */
function buildSitemapXml(staticPaths, content, siteUrl) {
  const urls = [...staticPaths];
  for (const n of (content.news && content.news.items) || []) urls.push(`/noticias/${n.slug}`);
  for (const d of (content.dojos && content.dojos.items) || []) urls.push(`/dojos/${d.slug}`);
  for (const k of (content.karate && content.karate.disciplines) || []) urls.push(`/karate/${k.slug}`);

  const entries = urls.map(u => `  <url><loc>${escapeXml(siteUrl + u)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/** Gera o robots.txt: permite tudo excepto /admin e /api, aponta para o sitemap. */
function buildRobotsTxt(siteUrl) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

module.exports = { buildSitemapXml, buildRobotsTxt };
