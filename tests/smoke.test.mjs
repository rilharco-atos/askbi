/* ─── ASBKI Covilhã — testes de fumo (servidor) ─────────────────────────────
   node --test. Correm contra a app Express importada diretamente (sem
   servidor externo), numa porta efémera. Cobrem: rotas 200, redirects 301,
   404 reais, cabeçalhos de segurança, robots/sitemap, injeção de conteúdo,
   gate de placeholders no HTML servido, e os contratos de leads (inscrição
   e contacto) que ainda não existem neste ramo.

   Testes marcados com `t.skip(motivo)` dependem de trabalho de outro agente
   (servidor: leads, metadados, cabeçalhos de segurança, robots/sitemap,
   páginas legais). Ativar depois da fusão — ver docs/qa/baseline.md. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'qa-test-password';

let app, server, base;

before(async () => {
  ({ default: app } = await import('../server.js'));
  await new Promise((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', err => (err ? reject(err) : resolve()));
  });
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
});

/* ─── Rotas de páginas ──────────────────────────────────────────────────── */

const PAGE_ROUTES = [
  '/', '/dojos', '/noticias', '/karate', '/associacao',
  '/associacao/historia', '/associacao/orgaos-sociais',
  '/associacao/instrutores', '/associacao/dojo-kun',
  '/inscricao', '/contacto',
];

for (const route of PAGE_ROUTES) {
  test(`GET ${route} responde 200`, async () => {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, `${route} devolveu ${res.status}`);
    const html = await res.text();
    assert.match(html, /<html/i);
  });
}

const DETAIL_ROUTES = [
  ['/noticias/potencia-nasce-na-anca', 'notícia existente'],
  ['/karate/kihon', 'disciplina existente'],
  ['/dojos/covilha', 'dojo existente'],
];

for (const [route, desc] of DETAIL_ROUTES) {
  test(`GET ${route} (${desc}) responde 200`, async () => {
    const res = await fetch(base + route);
    assert.equal(res.status, 200);
  });
}

/* ─── Redirecionamentos 301 ─────────────────────────────────────────────── */

const REDIRECTS = {
  '/modalidades': '/karate',
  '/eventos': '/noticias',
  '/competicoes': '/noticias',
  '/formacoes': '/noticias',
};

for (const [from, to] of Object.entries(REDIRECTS)) {
  test(`GET ${from} redireciona 301 para ${to}`, async () => {
    const res = await fetch(base + from, { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), to);
  });

  test(`GET ${from}/algures redireciona 301 (qualquer subcaminho)`, async () => {
    // server.js regista `${from}/*` a redirecionar sempre para o destino plano
    // (não preserva o subcaminho) — comportamento atual, testado como está.
    const res = await fetch(base + from + '/algures', { redirect: 'manual' });
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), to);
  });
}

/* ─── 404 reais ─────────────────────────────────────────────────────────── */

test('GET /rota-inexistente devolve 404 real com pages/404.html', async () => {
  const res = await fetch(base + '/rota-inexistente');
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /(não encontrada|404)/i);
});

test('GET /api/rota-inexistente devolve 404 JSON (não HTML)', async () => {
  const res = await fetch(base + '/api/rota-inexistente');
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(typeof body.error, 'string');
});

test('GET /noticias/nao-existe devolve 404 real (slug inexistente)', { todo: true }, async (t) => {
  // Contrato: server.js serve sempre pages/noticia.html com 200 para qualquer
  // slug (o conteúdo é resolvido no cliente a partir de content.json). Para
  // cumprir o contrato de 404 real por slug inexistente, o servidor precisa
  // de validar o slug contra o conteúdo antes de responder — é trabalho do
  // agente de metadados/servidor (rotas dinâmicas com SSR/validação de slug).
  const res = await fetch(base + '/noticias/nao-existe');
  assert.equal(res.status, 404);
});

test('GET /dojos/nao-existe devolve 404 real (slug inexistente)', { todo: true }, async (t) => {
  // Mesmo motivo que o teste anterior.
  const res = await fetch(base + '/dojos/nao-existe');
  assert.equal(res.status, 404);
});

/* ─── Cabeçalhos de segurança ───────────────────────────────────────────── */

test('cabeçalhos de segurança presentes em /', { todo: true }, async (t) => {
  // Contrato: nosniff, Referrer-Policy, X-Frame-Options, CSP, sem X-Powered-By.
  // Ainda não implementado neste ramo (baseline atual: X-Powered-By: Express
  // presente, nenhum dos cabeçalhos de segurança definido) — ver
  // docs/qa/baseline.md. Desbloqueia quando o agente do servidor acrescentar
  // o middleware de cabeçalhos.
  const res = await fetch(base + '/');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(res.headers.get('referrer-policy'));
  assert.ok(res.headers.get('x-frame-options'));
  assert.ok(res.headers.get('content-security-policy'));
  assert.equal(res.headers.get('x-powered-by'), null);
});

/* ─── robots.txt / sitemap.xml / favicon ───────────────────────────────── */

test('GET /robots.txt responde 200', { todo: true }, async (t) => {
  // Não implementado neste ramo — ver docs/qa/baseline.md.
  const res = await fetch(base + '/robots.txt');
  assert.equal(res.status, 200);
});

test('GET /sitemap.xml responde 200 com as rotas do site', { todo: true }, async (t) => {
  // Não implementado neste ramo — ver docs/qa/baseline.md.
  const res = await fetch(base + '/sitemap.xml');
  assert.equal(res.status, 200);
  const xml = await res.text();
  for (const route of PAGE_ROUTES) assert.match(xml, new RegExp(route.replace(/\//g, '\\/')));
});

test('GET /favicon.ico responde 200', { todo: true }, async (t) => {
  // Atualmente devolve 204 (placeholder sem ícone real) — ícone real é
  // trabalho do agente de chrome/fontes. Ver docs/qa/baseline.md.
  const res = await fetch(base + '/favicon.ico');
  assert.equal(res.status, 200);
});

/* ─── Conteúdo injetado no head ─────────────────────────────────────────── */

test('/ e /karate expõem <script id="asbki-content"> no head', { todo: true }, async (t) => {
  // Contrato para SSR/SEO: injeção do JSON de conteúdo no head do HTML
  // servido. Não implementado neste ramo (o conteúdo é hoje obtido só via
  // fetch('/api/content') no cliente). Ver docs/qa/baseline.md.
  for (const route of ['/', '/karate']) {
    const html = await (await fetch(base + route)).text();
    assert.match(html, /<script id="asbki-content" type="application\/json">/);
  }
});

/* ─── Metadados por rota ────────────────────────────────────────────────── */

test('títulos diferem por página', async () => {
  const home = await (await fetch(base + '/')).text();
  const karate = await (await fetch(base + '/karate')).text();
  const titleOf = html => (html.match(/<title>([^<]*)<\/title>/) || [])[1];
  assert.notEqual(titleOf(home), titleOf(karate));
  assert.ok(titleOf(home));
  assert.ok(titleOf(karate));
});

test('og:image absoluto e canonical presentes em todas as rotas', { todo: true }, async (t) => {
  // Contrato de metadados por rota. Hoje só / tem og:image (relativo, não
  // absoluto) e nenhuma página tem <link rel="canonical">. Trabalho do
  // agente de metadados. Ver docs/qa/baseline.md.
  for (const route of PAGE_ROUTES) {
    const html = await (await fetch(base + route)).text();
    const ogImage = (html.match(/property="og:image" content="([^"]*)"/) || [])[1];
    assert.ok(ogImage && /^https?:\/\//.test(ogImage), `${route}: og:image ausente ou não absoluto`);
    assert.match(html, /<link rel="canonical" href="https?:\/\/[^"]+"/, `${route}: canonical ausente`);
  }
});

/* ─── Leads: /api/inscricao e /api/contacto ─────────────────────────────── */

test('POST /api/inscricao com body inválido devolve 400', { todo: true }, async (t) => {
  // Endpoint ainda não existe neste ramo (404). Trabalho do agente de leads.
  const res = await fetch(base + '/api/inscricao', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.ok(Array.isArray(body.errors));
});

test('POST /api/inscricao com honeypot preenchido devolve 200 sem efeito', { todo: true }, async (t) => {
  const res = await fetch(base + '/api/inscricao', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Teste', phone: '912345678', website: 'http://spam.example' }),
  });
  assert.equal(res.status, 200);
});

test('POST /api/inscricao com 6 pedidos em 10 minutos devolve 429 no 6º', { todo: true }, async (t) => {
  const payload = { name: 'Teste', phone: '912345678' };
  let last;
  for (let i = 0; i < 6; i++) {
    last = await fetch(base + '/api/inscricao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
  }
  assert.equal(last.status, 429);
});

test('POST /api/contacto com body inválido devolve 400', { todo: true }, async (t) => {
  const res = await fetch(base + '/api/contacto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.ok(Array.isArray(body.errors));
});

test('POST /api/contacto com honeypot preenchido devolve 200 sem efeito', { todo: true }, async (t) => {
  const res = await fetch(base + '/api/contacto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Teste', email: 'teste@example.com', message: 'olá', website: 'http://spam.example' }),
  });
  assert.equal(res.status, 200);
});

test('POST /api/contacto com 6 pedidos em 10 minutos devolve 429 no 6º', { todo: true }, async (t) => {
  const payload = { name: 'Teste', email: 'teste@example.com', message: 'olá' };
  let last;
  for (let i = 0; i < 6; i++) {
    last = await fetch(base + '/api/contacto', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
  }
  assert.equal(last.status, 429);
});

/* ─── Páginas legais ────────────────────────────────────────────────────── */

test('GET /privacidade responde 200', { todo: true }, async (t) => {
  // Página ainda não existe neste ramo. Ver docs/qa/baseline.md.
  const res = await fetch(base + '/privacidade');
  assert.equal(res.status, 200);
});

test('GET /termos responde 200', { todo: true }, async (t) => {
  const res = await fetch(base + '/termos');
  assert.equal(res.status, 200);
});

/* ─── Gate de placeholders no HTML servido ──────────────────────────────── */

test('nenhuma página serve "000 000" ou "a confirmar" no HTML estático', async () => {
  const bad = [];
  for (const route of PAGE_ROUTES) {
    // o bloco #asbki-content é o content.json em bruto (dados, não texto visível): o gate dos placeholders é
    // aplicado pelos renderers no cliente e o ficheiro em si tem o seu próprio teste abaixo
    const html = (await (await fetch(base + route)).text()).replace(/<script id="asbki-content"[\s\S]*?<\/script>/, '');
    if (/000\s*000/.test(html) || /a confirmar/i.test(html)) bad.push(route);
  }
  assert.deepEqual(bad, [], `placeholders encontrados no HTML servido de: ${bad.join(', ')}`);
});

/* ─── content.json (ficheiro local, sem servidor) ───────────────────────── */

test('content.json local não contém placeholders "000 000" nem "a confirmar"', { todo: true }, async (t) => {
  // Falha real e esperada: o cliente ainda não forneceu os dados finais
  // (telefones, moradas, nomes de instrutores). Ver scripts/check-content.mjs
  // e docs/qa/baseline.md para a lista de campos em falta.
  const raw = readFileSync(path.join(ROOT, 'content.json'), 'utf-8');
  assert.doesNotMatch(raw, /000\s*000/);
  assert.doesNotMatch(raw, /a confirmar/i);
});
