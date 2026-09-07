/* ─── Router de páginas HTML ─────────────────────────────────────────────
   Serve index.html e pages/*.html com o <head> enriquecido: conteúdo
   actual embutido, metadados por rota, JSON-LD, ícones e (opcional)
   Plausible. Também sitemap.xml, robots.txt e as páginas legais. */

const express = require('express');
const fs = require('fs');
const path = require('path');

const { resolveRouteMeta, getSiteUrl } = require('./meta');
const { injectHead, injectContentOnly } = require('./head-inject');
const { ICONS_HTML } = require('./icons');
const { plausibleScriptTag } = require('./analytics');
const { getAssetVersion, applyAssetVersion } = require('./asset-version');
const { buildSitemapXml, buildRobotsTxt } = require('./sitemap');
const { buildLegalPage } = require('./legal');
const log = require('./log');

const ROOT_DIR = path.join(__dirname, '..');
const PAGES_DIR = path.join(ROOT_DIR, 'pages');

/* URL limpa → ficheiro HTML (páginas estáticas, sem parâmetros) */
const PAGES = {
  '/':                          'index.html',
  '/dojos':                     'pages/dojos.html',
  '/noticias':                  'pages/noticias.html',
  '/karate':                    'pages/karate.html',
  '/associacao':                'pages/associacao.html',
  '/associacao/historia':       'pages/historia.html',
  '/associacao/orgaos-sociais': 'pages/orgaos-sociais.html',
  '/associacao/instrutores':    'pages/instrutores.html',
  '/associacao/dojo-kun':       'pages/dojo-kun.html',
  '/inscricao':                 'pages/inscricao.html',
  '/contacto':                  'pages/contacto.html',
};

const META_KIND_BY_ROUTE = {
  '/': 'home',
  '/dojos': 'dojos-list',
  '/noticias': 'noticias-list',
  '/karate': 'karate-list',
  '/inscricao': 'inscricao',
  '/contacto': 'contacto',
};

function readFileCached() {
  /* Sem cache de ficheiro: em Vercel cada função é efémera e o custo de
     ler um HTML de poucos KB é irrelevante; simplifica invalidação. */
  return (file) => fs.readFileSync(path.join(ROOT_DIR, file), 'utf-8');
}

/**
 * Cria o router de páginas.
 * @param {object} opts
 * @param {Function} opts.readContent () => Promise<object>
 */
function createPagesRouter({ readContent }) {
  const router = express.Router();
  const readFile = readFileCached();
  const assetVersion = getAssetVersion(ROOT_DIR);

  function commonHead(req, content) {
    return {
      iconsHtml: ICONS_HTML,
      plausibleHtml: plausibleScriptTag(),
      assetVersion,
    };
  }

  async function renderNotFound(res, content, req) {
    let html = readFile('pages/404.html');
    html = injectContentOnly(html, { content, ...commonHead(req, content) });
    html = applyAssetVersion(html, assetVersion);
    res.status(404).setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  async function renderStatic(req, res, file, kind) {
    const content = await readContent();
    const siteUrl = getSiteUrl(req);
    const meta = resolveRouteMeta({ kind, content, siteUrl, routePath: req.path });
    let html = readFile(file);
    html = injectHead(html, { meta, content, ...commonHead(req, content) });
    html = applyAssetVersion(html, assetVersion);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  async function renderDetail(req, res, { file, kind, param }) {
    const content = await readContent();
    const siteUrl = getSiteUrl(req);
    const meta = resolveRouteMeta({
      kind, content, siteUrl, routePath: req.path, params: { slug: req.params[param] },
    });
    if (meta.notFound) return renderNotFound(res, content, req);
    let html = readFile(file);
    html = injectHead(html, { meta, content, ...commonHead(req, content) });
    html = applyAssetVersion(html, assetVersion);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  async function renderLegal(req, res, kind) {
    const content = await readContent();
    const siteUrl = getSiteUrl(req);
    const legalKind = kind === 'privacidade' ? 'legal-privacidade' : 'legal-termos';
    const meta = resolveRouteMeta({ kind: legalKind, content, siteUrl, routePath: req.path });
    const { title, bodyHtml } = buildLegalPage(kind, content);
    let html = readFile('pages/legal.html');
    html = html
      .replace('<!--ASBKI_LEGAL_TITLE-->', title)
      .replace('<!--ASBKI_LEGAL_BODY-->', bodyHtml);
    html = injectHead(html, { meta, content, ...commonHead(req, content) });
    html = applyAssetVersion(html, assetVersion);
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  }

  for (const [route, file] of Object.entries(PAGES)) {
    router.get(route, (req, res, next) => renderStatic(req, res, file, META_KIND_BY_ROUTE[route] || 'generic').catch(next));
  }
  router.get('/noticias/:slug', (req, res, next) => renderDetail(req, res, { file: 'pages/noticia.html', kind: 'noticias-detail', param: 'slug' }).catch(next));
  router.get('/karate/:slug', (req, res, next) => renderDetail(req, res, { file: 'pages/disciplina.html', kind: 'karate-detail', param: 'slug' }).catch(next));
  router.get('/dojos/:slug', (req, res, next) => renderDetail(req, res, { file: 'pages/dojo.html', kind: 'dojos-detail', param: 'slug' }).catch(next));
  router.get('/privacidade', (req, res, next) => renderLegal(req, res, 'privacidade').catch(next));
  router.get('/termos', (req, res, next) => renderLegal(req, res, 'termos').catch(next));

  router.get('/sitemap.xml', async (req, res, next) => {
    try {
      const content = await readContent();
      const siteUrl = getSiteUrl(req);
      const staticPaths = [...Object.keys(PAGES), '/privacidade', '/termos'];
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buildSitemapXml(staticPaths, content, siteUrl));
    } catch (err) { next(err); }
  });

  router.get('/robots.txt', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildRobotsTxt(getSiteUrl(req)));
  });

  router.get('/favicon.ico', (req, res) => {
    res.redirect(301, '/assets/icons/favicon.svg');
  });

  return { router, PAGES, renderNotFound };
}

module.exports = { createPagesRouter, PAGES };
