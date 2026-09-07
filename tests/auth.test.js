const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyScrypt, checkAdminPassword, isAdminConfigured, getTokenSecret } = require('../server/auth');

test('hashPassword + verifyScrypt: ida e volta correcta', () => {
  const stored = hashPassword('a-minha-password');
  assert.equal(verifyScrypt('a-minha-password', stored), true);
  assert.equal(verifyScrypt('password-errada', stored), false);
});

test('verifyScrypt: rejeita formato inválido sem lançar', () => {
  assert.equal(verifyScrypt('qualquer', 'formato-invalido'), false);
  assert.equal(verifyScrypt('qualquer', ''), false);
  assert.equal(verifyScrypt('qualquer', undefined), false);
});

test('checkAdminPassword: via ADMIN_PASSWORD_HASH (preferido)', () => {
  const prevHash = process.env.ADMIN_PASSWORD_HASH;
  const prevPlain = process.env.ADMIN_PASSWORD;
  try {
    process.env.ADMIN_PASSWORD_HASH = hashPassword('segredo123');
    delete process.env.ADMIN_PASSWORD;
    assert.equal(checkAdminPassword('segredo123'), true);
    assert.equal(checkAdminPassword('errada'), false);
  } finally {
    if (prevHash === undefined) delete process.env.ADMIN_PASSWORD_HASH; else process.env.ADMIN_PASSWORD_HASH = prevHash;
    if (prevPlain === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = prevPlain;
  }
});

test('checkAdminPassword: compatibilidade com ADMIN_PASSWORD em claro', () => {
  const prevHash = process.env.ADMIN_PASSWORD_HASH;
  const prevPlain = process.env.ADMIN_PASSWORD;
  try {
    delete process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD = 'plain123';
    assert.equal(checkAdminPassword('plain123'), true);
    assert.equal(checkAdminPassword('outra'), false);
  } finally {
    if (prevHash === undefined) delete process.env.ADMIN_PASSWORD_HASH; else process.env.ADMIN_PASSWORD_HASH = prevHash;
    if (prevPlain === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = prevPlain;
  }
});

test('checkAdminPassword: sem nenhuma via configurada, recusa sempre', () => {
  const prevHash = process.env.ADMIN_PASSWORD_HASH;
  const prevPlain = process.env.ADMIN_PASSWORD;
  try {
    delete process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD;
    assert.equal(checkAdminPassword('qualquer'), false);
    assert.equal(isAdminConfigured(), false);
  } finally {
    if (prevHash === undefined) delete process.env.ADMIN_PASSWORD_HASH; else process.env.ADMIN_PASSWORD_HASH = prevHash;
    if (prevPlain === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = prevPlain;
  }
});

test('getTokenSecret: prefere ADMIN_TOKEN_SECRET explícita', () => {
  const prev = process.env.ADMIN_TOKEN_SECRET;
  try {
    process.env.ADMIN_TOKEN_SECRET = 'segredo-explicito';
    assert.equal(getTokenSecret(), 'segredo-explicito');
  } finally {
    if (prev === undefined) delete process.env.ADMIN_TOKEN_SECRET; else process.env.ADMIN_TOKEN_SECRET = prev;
  }
});
