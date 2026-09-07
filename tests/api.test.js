/* Testes de integração: arrancam a app Express num porto efémero e batem
   nos endpoints com fetch, tal como um cliente real. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.ADMIN_PASSWORD = 'teste-password-123';
delete process.env.ADMIN_PASSWORD_HASH;
delete process.env.NODE_ENV;

const app = require('../server.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET / devolve 200, cabeçalhos de segurança e bloco de conteúdo', async () => {
  const res = await fetch(`${baseUrl}/`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.ok(res.headers.get('content-security-policy').includes("default-src 'self'"));
  const html = await res.text();
  assert.ok(html.includes('id="asbki-content"'));
  assert.match(html, /<title>[^<]*ASBKI[^<]*<\/title>/);
});

test('GET /dojos/:slug inexistente devolve 404 com a página de erro', async () => {
  const res = await fetch(`${baseUrl}/dojos/nao-existe-mesmo`);
  assert.equal(res.status, 404);
  const html = await res.text();
  assert.match(html, /404/);
});

test('GET /rota-desconhecida devolve 404', async () => {
  const res = await fetch(`${baseUrl}/esta-rota-nao-existe`);
  assert.equal(res.status, 404);
});

test('GET /api/rota-desconhecida devolve 404 em JSON', async () => {
  const res = await fetch(`${baseUrl}/api/rota-desconhecida`);
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.ok(body.error);
});

test('GET /sitemap.xml e /robots.txt respondem com o conteúdo esperado', async () => {
  const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), /<urlset/);

  const robots = await fetch(`${baseUrl}/robots.txt`);
  assert.equal(robots.status, 200);
  const robotsText = await robots.text();
  assert.match(robotsText, /Disallow: \/admin/);
  assert.match(robotsText, /Disallow: \/api/);
});

test('POST /api/admin/login: password errada -> 401, correta -> token', async () => {
  const bad = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'errada' }),
  });
  assert.equal(bad.status, 401);

  const good = await fetch(`${baseUrl}/api/admin/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'teste-password-123' }),
  });
  assert.equal(good.status, 200);
  const { token } = await good.json();
  assert.ok(token);
});

test('GET /api/admin/versions sem token -> 401', async () => {
  const res = await fetch(`${baseUrl}/api/admin/versions`);
  assert.equal(res.status, 401);
});

test('POST /api/inscricao: honeypot devolve 200 sem gravar', async () => {
  const res = await fetch(`${baseUrl}/api/inscricao`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bot', phone: '912345678', sessionId: 's1', consent: true, website: 'http://spam.com' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
});

test('POST /api/inscricao: telefone inválido devolve 400 com erro em pt-PT', async () => {
  const res = await fetch(`${baseUrl}/api/inscricao`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ana Silva', phone: '123', sessionId: 's1', consent: true, website: '' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.match(body.errors.phone, /válido/);
});

test('POST /api/inscricao: sessionId inexistente devolve 400', async () => {
  const res = await fetch(`${baseUrl}/api/inscricao`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Ana Silva', phone: '912345678', sessionId: 'não-existe', consent: true, website: '' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.errors.sessionId, /inválida/);
});

test('POST /api/contacto: mensagem curta devolve 400', async () => {
  const res = await fetch(`${baseUrl}/api/contacto`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Rui', email: 'rui@example.com', message: 'curta', consent: true, website: '' }),
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.match(body.errors.message, /10/);
});

test('POST /api/content sem token -> 401', async () => {
  const res = await fetch(`${baseUrl}/api/content`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 401);
});
