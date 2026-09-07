/* ─── Metadados por rota: title, description, canonical, OG, JSON-LD ──── */

const { isPlaceholder } = require('./schema');

/** Escapa texto para caber em atributos/HTML sem partir marcação. */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Calcula a base pública do site: SITE_URL, senão https + host do pedido. */
function getSiteUrl(req) {
  const configured = (process.env.SITE_URL || '').replace(/\/+$/, '');
  if (configured) return configured;
  const host = req.get('host');
  return `https://${host}`;
}

function absoluteUrl(siteUrl, maybePath) {
  if (!maybePath) return '';
  if (/^https?:\/\//i.test(maybePath)) return maybePath;
  return `${siteUrl}${maybePath.startsWith('/') ? '' : '/'}${maybePath}`;
}

function truncate(str, max) {
  const s = String(str || '').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

/** Organization — sempre presente, com logo e redes sociais quando existirem. */
function buildOrganizationJsonLd(content, siteUrl) {
  const site = content.site || {};
  const sameAs = ['facebook', 'instagram', 'youtube', 'tiktok']
    .map(k => site[k])
    .filter(v => typeof v === 'string' && v.trim() && !isPlaceholder(v));
  const node = {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: site.name || 'ASBKI',
    url: siteUrl,
  };
  if (site.logo && !isPlaceholder(site.logo)) node.logo = absoluteUrl(siteUrl, site.logo);
  if (site.phone && !isPlaceholder(site.phone)) node.telephone = site.phone;
  if (site.email && !isPlaceholder(site.email)) node.email = site.email;
  if (sameAs.length) node.sameAs = sameAs;
  return node;
}

/** SportsActivityLocation por dojo — só quando a morada não é placeholder. */
function buildDojoJsonLd(dojo, siteUrl) {
  if (!dojo || isPlaceholder(dojo.address)) return null;
  const node = {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: dojo.name,
    address: dojo.address,
    url: absoluteUrl(siteUrl, `/dojos/${dojo.slug}`),
  };
  if (dojo.phone && !isPlaceholder(dojo.phone)) node.telephone = dojo.phone;
  if (dojo.image) node.image = absoluteUrl(siteUrl, dojo.image);
  return node;
}

function buildNewsArticleJsonLd(article, siteUrl) {
  if (!article) return null;
  const node = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    datePublished: article.date,
    author: { '@type': 'Organization', name: article.author || 'ASBKI' },
    url: absoluteUrl(siteUrl, `/noticias/${article.slug}`),
  };
  if (article.excerpt) node.description = truncate(article.excerpt, 300);
  if (article.image) node.image = absoluteUrl(siteUrl, article.image);
  return node;
}

function buildBreadcrumbJsonLd(items, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(siteUrl, it.path),
    })),
  };
}

const DEFAULT_OG_IMAGE = '/assets/dojo/hero-poster.jpg';

/**
 * Resolve os metadados de uma rota a partir do conteúdo actual.
 * @param {object} opts
 * @param {string} opts.kind identificador da rota (ver server.js PAGES/META_KINDS)
 * @param {object} [opts.params] parâmetros da rota (ex. { slug })
 * @param {object} opts.content conteúdo actual (já migrado)
 * @param {string} opts.siteUrl base pública do site
 * @param {string} opts.routePath caminho do pedido (para canonical/breadcrumb)
 * @returns {{notFound?: boolean, title: string, description: string, canonical: string,
 *   ogTitle: string, ogDescription: string, ogImage: string, ogType: string, jsonLd: object[]}}
 */
function resolveRouteMeta({ kind, params = {}, content, siteUrl, routePath }) {
  const site = content.site || {};
  const siteName = site.name || 'ASBKI';
  const jsonLd = [buildOrganizationJsonLd(content, siteUrl)];
  const canonical = absoluteUrl(siteUrl, routePath);
  const base = {
    title: `${siteName} Covilhã`,
    description: 'Karate Shotokan na Covilhã. Turmas para todas as idades. Primeira aula gratuita.',
    ogType: 'website',
    ogImage: absoluteUrl(siteUrl, DEFAULT_OG_IMAGE),
  };

  switch (kind) {
    case 'home': {
      const hero = content.hero || {};
      base.title = `${siteName} Covilhã — Karate Shotokan`;
      base.description = truncate(hero.subtext || base.description, 160);
      break;
    }
    case 'dojos-list': {
      const d = content.dojos || {};
      base.title = `${d.title || 'Os nossos dojos'} — ${siteName}`;
      base.description = truncate(d.intro || base.description, 160);
      jsonLd.push(buildBreadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Dojos', path: '/dojos' }], siteUrl));
      break;
    }
    case 'dojos-detail': {
      const items = (content.dojos && content.dojos.items) || [];
      const dojo = items.find(d => d.slug === params.slug);
      if (!dojo) return { notFound: true };
      base.title = `${dojo.name} — ${siteName}`;
      base.description = truncate(dojo.intro || dojo.notes || base.description, 160);
      if (dojo.image) base.ogImage = absoluteUrl(siteUrl, dojo.image);
      const dojoLd = buildDojoJsonLd(dojo, siteUrl);
      if (dojoLd) jsonLd.push(dojoLd);
      jsonLd.push(buildBreadcrumbJsonLd([
        { name: 'Início', path: '/' }, { name: 'Dojos', path: '/dojos' }, { name: dojo.name, path: `/dojos/${dojo.slug}` },
      ], siteUrl));
      break;
    }
    case 'noticias-list': {
      const n = content.news || {};
      base.title = `${n.title || 'Notícias'} — ${siteName}`;
      base.description = truncate(n.intro || base.description, 160);
      jsonLd.push(buildBreadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Notícias', path: '/noticias' }], siteUrl));
      break;
    }
    case 'noticias-detail': {
      const items = (content.news && content.news.items) || [];
      const article = items.find(a => a.slug === params.slug);
      if (!article) return { notFound: true };
      base.title = `${article.title} — ${siteName}`;
      base.description = truncate(article.excerpt || base.description, 160);
      base.ogType = 'article';
      if (article.image) base.ogImage = absoluteUrl(siteUrl, article.image);
      const articleLd = buildNewsArticleJsonLd(article, siteUrl);
      if (articleLd) jsonLd.push(articleLd);
      jsonLd.push(buildBreadcrumbJsonLd([
        { name: 'Início', path: '/' }, { name: 'Notícias', path: '/noticias' }, { name: article.title, path: `/noticias/${article.slug}` },
      ], siteUrl));
      break;
    }
    case 'karate-list': {
      const k = content.karate || {};
      base.title = `${k.title || 'Karate'} — ${siteName}`;
      base.description = truncate(k.intro || base.description, 160);
      jsonLd.push(buildBreadcrumbJsonLd([{ name: 'Início', path: '/' }, { name: 'Karate', path: '/karate' }], siteUrl));
      break;
    }
    case 'karate-detail': {
      const items = (content.karate && content.karate.disciplines) || [];
      const disc = items.find(d => d.slug === params.slug);
      if (!disc) return { notFound: true };
      base.title = `${disc.name} — ${siteName}`;
      base.description = truncate(disc.excerpt || disc.intro || base.description, 160);
      jsonLd.push(buildBreadcrumbJsonLd([
        { name: 'Início', path: '/' }, { name: 'Karate', path: '/karate' }, { name: disc.name, path: `/karate/${disc.slug}` },
      ], siteUrl));
      break;
    }
    case 'inscricao': {
      const i = content.inscription || {};
      base.title = `${i.title || 'Marcar aula experimental'} — ${siteName}`;
      base.description = 'Marca a tua aula experimental gratuita de karate na ASBKI Covilhã.';
      break;
    }
    case 'contacto': {
      const c = content.contact || {};
      base.title = `${c.title || 'Contactos'} — ${siteName}`;
      base.description = truncate(c.intro || base.description, 160);
      break;
    }
    case 'legal-privacidade':
      base.title = `Política de Privacidade — ${siteName}`;
      base.description = 'Política de privacidade e proteção de dados da ASBKI Covilhã.';
      break;
    case 'legal-termos':
      base.title = `Termos e Condições — ${siteName}`;
      base.description = 'Termos e condições de utilização do site da ASBKI Covilhã.';
      break;
    default:
      break;
  }

  return {
    title: base.title,
    description: base.description,
    canonical,
    ogTitle: base.title,
    ogDescription: base.description,
    ogImage: base.ogImage,
    ogType: base.ogType,
    jsonLd: jsonLd.filter(Boolean),
  };
}

module.exports = { resolveRouteMeta, escapeHtml, getSiteUrl, absoluteUrl };
