/* ─── Password do admin: hash scrypt com salt ──────────────────────────
   Formato de ADMIN_PASSWORD_HASH: "scrypt:<salt-hex>:<hash-hex>".
   Gera um novo hash com: node -e "console.log(require('./server/auth').hashPassword('a-tua-password'))"
   Mantém compatibilidade com ADMIN_PASSWORD em claro (dev/legado) — avisa
   no log quando é essa a via usada, para migrar assim que possível. */

const crypto = require('crypto');
const log = require('./log');

const SCRYPT_KEYLEN = 64;

/**
 * Gera "scrypt:<salt>:<hash>" a partir de uma password em claro.
 * @param {string} password
 * @returns {string}
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verifica uma password em claro contra "scrypt:<salt>:<hash>".
 * @param {string} password
 * @param {string} stored
 * @returns {boolean}
 */
function verifyScrypt(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  try {
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

let warnedPlaintext = false;

/**
 * Verifica a password de admin submetida contra ADMIN_PASSWORD_HASH
 * (preferido) ou ADMIN_PASSWORD em claro (compatibilidade, com aviso).
 * @param {string} password password submetida no login
 * @returns {boolean}
 */
function checkAdminPassword(password) {
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (hash) return verifyScrypt(password, hash);

  const plain = process.env.ADMIN_PASSWORD || '';
  if (!plain) return false;
  if (!warnedPlaintext) {
    warnedPlaintext = true;
    log.warn('auth.password.plaintext', {
      message: 'ADMIN_PASSWORD em claro — define ADMIN_PASSWORD_HASH com hashPassword() assim que possível',
    });
  }
  const a = Buffer.from(String(password || ''));
  const b = Buffer.from(plain);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Indica se alguma via de autenticação de admin está configurada. */
function isAdminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD);
}

/**
 * Segredo usado para assinar os tokens de sessão do admin. Prefere
 * ADMIN_TOKEN_SECRET explícita; sem ela deriva de ADMIN_PASSWORD_HASH ou,
 * em último caso, de ADMIN_PASSWORD em claro (compatibilidade).
 */
function getTokenSecret() {
  return process.env.ADMIN_TOKEN_SECRET
    || process.env.ADMIN_PASSWORD_HASH
    || process.env.ADMIN_PASSWORD
    || '';
}

module.exports = { hashPassword, verifyScrypt, checkAdminPassword, isAdminConfigured, getTokenSecret };
