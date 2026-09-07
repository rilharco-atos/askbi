const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateContent, findPlaceholders, isPlaceholder } = require('../server/schema');

function minimalContent() {
  return {
    site: {}, nav: { links: [] }, hero: {}, schedule: { sessions: [], filters: [] },
    events: {}, benefits: [], classes: {}, about: {}, dojos: { items: [] },
    news: { items: [] }, inscription: {}, trial: {}, contact: {}, footer: {},
    karate: { disciplines: [] },
  };
}

test('validateContent: aceita a forma mínima esperada', () => {
  const { ok, errors } = validateContent(minimalContent());
  assert.equal(ok, true, JSON.stringify(errors));
});

test('validateContent: rejeita não-objeto', () => {
  assert.equal(validateContent(null).ok, false);
  assert.equal(validateContent([1, 2]).ok, false);
  assert.equal(validateContent('texto').ok, false);
});

test('validateContent: reporta secção em falta', () => {
  const c = minimalContent();
  delete c.site;
  const { ok, errors } = validateContent(c);
  assert.equal(ok, false);
  assert.ok(errors.some(e => e.includes('site')));
});

test('validateContent: reporta tipo errado numa lista', () => {
  const c = minimalContent();
  c.benefits = { não: 'é lista' };
  const { ok, errors } = validateContent(c);
  assert.equal(ok, false);
  assert.ok(errors.some(e => e.includes('benefits')));
});

test('validateContent: reporta tipo errado num objeto', () => {
  const c = minimalContent();
  c.site = 'não é objeto';
  const { ok, errors } = validateContent(c);
  assert.equal(ok, false);
  assert.ok(errors.some(e => e.includes('site')));
});

test('findPlaceholders: encontra valores placeholder aninhados', () => {
  const c = minimalContent();
  c.dojos.items = [{ name: 'Dojo X', address: 'Covilhã (morada a confirmar)' }];
  const found = findPlaceholders(c);
  assert.equal(found.length, 1);
  assert.equal(found[0].path, 'dojos.items.0.address');
});

test('findPlaceholders: nada quando não há placeholders', () => {
  const c = minimalContent();
  c.dojos.items = [{ name: 'Dojo X', address: 'Rua Principal 12, Covilhã' }];
  assert.equal(findPlaceholders(c).length, 0);
});

test('isPlaceholder: casos comuns', () => {
  assert.equal(isPlaceholder('a confirmar'), true);
  assert.equal(isPlaceholder('A CONFIRMAR'), true);
  assert.equal(isPlaceholder('000 000'), true);
  assert.equal(isPlaceholder('lorem ipsum'), true);
  assert.equal(isPlaceholder('Rua Principal 12'), false);
  assert.equal(isPlaceholder(42), false);
});
