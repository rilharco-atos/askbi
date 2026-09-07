const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateName, validatePhonePT, validateEmailOptional, validateEmailRequired,
  validateMessage, validateConsent, isHoneypotTriggered,
} = require('../server/validators');

test('validateName: caminho feliz', () => {
  assert.equal(validateName('Ana Silva'), null);
});

test('validateName: vazio, muito curto e muito longo', () => {
  assert.match(validateName(''), /obrigatório/);
  assert.match(validateName('A'), /2 e 80/);
  assert.match(validateName('A'.repeat(81)), /2 e 80/);
});

test('validatePhonePT: aceita formatos válidos', () => {
  assert.equal(validatePhonePT('912345678'), null);
  assert.equal(validatePhonePT('+351 912 345 678'), null);
  assert.equal(validatePhonePT('212345678'), null);
});

test('validatePhonePT: rejeita formatos inválidos', () => {
  assert.match(validatePhonePT('12345'), /válido/);
  assert.match(validatePhonePT('812345678'), /válido/); // não começa por 2 ou 9
  assert.match(validatePhonePT(''), /obrigatório/);
});

test('validateEmailOptional: vazio é válido, inválido é rejeitado', () => {
  assert.equal(validateEmailOptional(''), null);
  assert.equal(validateEmailOptional(undefined), null);
  assert.equal(validateEmailOptional('a@b.com'), null);
  assert.match(validateEmailOptional('nao-e-email'), /válido/);
});

test('validateEmailRequired: obrigatório', () => {
  assert.match(validateEmailRequired(''), /obrigatório/);
  assert.equal(validateEmailRequired('a@b.com'), null);
});

test('validateMessage: limites min/max', () => {
  assert.match(validateMessage('curta'), /pelo menos 10/);
  assert.equal(validateMessage('esta mensagem tem mais de dez caracteres'), null);
  assert.match(validateMessage('a'.repeat(2001)), /2000/);
});

test('validateConsent: tem de ser exactamente true', () => {
  assert.match(validateConsent(false), /tratamento de dados/);
  assert.match(validateConsent('true'), /tratamento de dados/);
  assert.equal(validateConsent(true), null);
});

test('isHoneypotTriggered: só true quando preenchido', () => {
  assert.equal(isHoneypotTriggered(''), false);
  assert.equal(isHoneypotTriggered(undefined), false);
  assert.equal(isHoneypotTriggered('http://spam.com'), true);
});
