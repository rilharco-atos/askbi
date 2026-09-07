const { test } = require('node:test');
const assert = require('node:assert/strict');
const { injectHead, injectContentOnly, stripExistingMeta } = require('../server/head-inject');

const SAMPLE_HTML = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Título antigo</title>
  <meta name="description" content="Descrição antiga">
  <meta property="og:title" content="OG antigo">
  <link rel="canonical" href="/antigo">
</head>
<body></body>
</html>`;

function sampleMeta() {
  return {
    title: 'Título novo',
    description: 'Descrição nova',
    canonical: 'https://asbki.pt/nova',
    ogTitle: 'OG novo',
    ogDescription: 'OG descrição nova',
    ogImage: 'https://asbki.pt/img.jpg',
    ogType: 'website',
    jsonLd: [{ '@context': 'https://schema.org', '@type': 'SportsOrganization', name: 'ASBKI' }],
  };
}

test('stripExistingMeta: remove title/description/og/canonical', () => {
  const stripped = stripExistingMeta(SAMPLE_HTML);
  assert.ok(!stripped.includes('Título antigo'));
  assert.ok(!stripped.includes('Descrição antiga'));
  assert.ok(!stripped.includes('OG antigo'));
  assert.ok(!stripped.includes('/antigo'));
});

test('injectHead: substitui title e insere JSON-LD e bloco de conteúdo', () => {
  const html = injectHead(SAMPLE_HTML, { meta: sampleMeta(), content: { site: { name: 'ASBKI' } } });
  assert.ok(html.includes('<title>Título novo</title>'));
  assert.ok(!html.includes('Título antigo'));
  assert.ok(html.includes('id="asbki-content"'));
  assert.ok(html.includes('"name":"ASBKI"'));
});

test('injectHead: escapa "</" dentro do JSON para não fechar a tag script', () => {
  const content = { site: { name: 'ASBKI' }, dangerous: '</script><script>alert(1)</script>' };
  const html = injectHead(SAMPLE_HTML, { meta: sampleMeta(), content });
  assert.ok(!html.includes('</script><script>alert(1)'));
  assert.ok(html.includes('<\\/script'));
});

test('injectHead: escapa HTML no título (protege contra XSS via conteúdo)', () => {
  const meta = sampleMeta();
  meta.title = '<img src=x onerror=alert(1)>';
  const html = injectHead(SAMPLE_HTML, { meta, content: {} });
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;img'));
});

test('injectContentOnly: mantém title/description originais, só acrescenta conteúdo', () => {
  const html = injectContentOnly(SAMPLE_HTML, { content: { site: { name: 'ASBKI' } } });
  assert.ok(html.includes('Título antigo'));
  assert.ok(html.includes('id="asbki-content"'));
});
