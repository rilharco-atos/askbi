const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveRouteMeta, escapeHtml, absoluteUrl } = require('../server/meta');

function fixtureContent() {
  return {
    site: { name: 'ASBKI', email: 'geral@asbki-covilha.pt', phone: '+351 275 000 000', logo: '' },
    hero: { subtext: 'Karate Shotokan na Covilhã.' },
    dojos: {
      title: 'Os nossos dojos',
      intro: 'Dois espaços no concelho.',
      items: [
        { slug: 'covilha', name: 'Dojo Covilhã', address: 'Covilhã (morada a confirmar)', intro: 'O dojo principal.' },
        { slug: 'real', name: 'Dojo Real', address: 'Rua Principal 12, Covilhã', intro: 'Um dojo com morada real.' },
      ],
    },
    news: {
      title: 'Notícias', intro: 'Artigos do clube.',
      items: [{ slug: 'artigo-1', title: 'Primeiro artigo', excerpt: 'Resumo do artigo.', date: '2026-01-01', author: 'Equipa' }],
    },
    karate: {
      title: 'Karate', intro: 'Kihon, kata e kumite.',
      disciplines: [{ slug: 'kihon', name: 'Kihon', excerpt: 'A base.' }],
    },
    inscription: { title: 'Marcar aula' },
    contact: { title: 'Contactos', intro: 'Fala connosco.' },
  };
}

test('escapeHtml: escapa caracteres perigosos', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml(`O "Rui" & a Ana`), 'O &quot;Rui&quot; &amp; a Ana');
});

test('absoluteUrl: mantém URLs absolutas e prefixa relativas', () => {
  assert.equal(absoluteUrl('https://asbki.pt', 'https://outro.com/x'), 'https://outro.com/x');
  assert.equal(absoluteUrl('https://asbki.pt', '/dojos'), 'https://asbki.pt/dojos');
  assert.equal(absoluteUrl('https://asbki.pt', 'dojos'), 'https://asbki.pt/dojos');
});

test('resolveRouteMeta: home inclui Organization JSON-LD', () => {
  const meta = resolveRouteMeta({ kind: 'home', content: fixtureContent(), siteUrl: 'https://asbki.pt', routePath: '/' });
  assert.match(meta.title, /ASBKI/);
  assert.ok(meta.jsonLd.some(n => n['@type'] === 'SportsOrganization'));
});

test('resolveRouteMeta: dojo com morada placeholder não gera SportsActivityLocation', () => {
  const meta = resolveRouteMeta({
    kind: 'dojos-detail', params: { slug: 'covilha' }, content: fixtureContent(),
    siteUrl: 'https://asbki.pt', routePath: '/dojos/covilha',
  });
  assert.equal(meta.notFound, undefined);
  assert.ok(!meta.jsonLd.some(n => n['@type'] === 'SportsActivityLocation'));
});

test('resolveRouteMeta: dojo com morada real gera SportsActivityLocation', () => {
  const meta = resolveRouteMeta({
    kind: 'dojos-detail', params: { slug: 'real' }, content: fixtureContent(),
    siteUrl: 'https://asbki.pt', routePath: '/dojos/real',
  });
  assert.ok(meta.jsonLd.some(n => n['@type'] === 'SportsActivityLocation'));
  const breadcrumb = meta.jsonLd.find(n => n['@type'] === 'BreadcrumbList');
  assert.ok(breadcrumb);
  assert.equal(breadcrumb.itemListElement.length, 3);
});

test('resolveRouteMeta: slug inexistente devolve notFound', () => {
  const meta = resolveRouteMeta({
    kind: 'dojos-detail', params: { slug: 'nao-existe' }, content: fixtureContent(),
    siteUrl: 'https://asbki.pt', routePath: '/dojos/nao-existe',
  });
  assert.equal(meta.notFound, true);
});

test('resolveRouteMeta: notícia gera NewsArticle e og:type article', () => {
  const meta = resolveRouteMeta({
    kind: 'noticias-detail', params: { slug: 'artigo-1' }, content: fixtureContent(),
    siteUrl: 'https://asbki.pt', routePath: '/noticias/artigo-1',
  });
  assert.equal(meta.ogType, 'article');
  assert.ok(meta.jsonLd.some(n => n['@type'] === 'NewsArticle'));
});
