/* ─── Validação de input de utilizador (fronteira do sistema) ─────────── */

/* Telemóvel português: 9 dígitos a começar por 2 ou 9, com ou sem +351 e espaços. */
const PT_PHONE_RE = /^(?:\+351\s?)?(?:2|9)\d{2}\s?\d{3}\s?\d{3}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/** Valida o nome (2 a 80 caracteres). Devolve uma mensagem de erro ou null. */
function validateName(name) {
  if (!isNonEmptyString(name)) return 'O nome é obrigatório.';
  const len = name.trim().length;
  if (len < 2 || len > 80) return 'O nome deve ter entre 2 e 80 caracteres.';
  return null;
}

/** Valida um telemóvel português. Devolve uma mensagem de erro ou null. */
function validatePhonePT(phone) {
  if (!isNonEmptyString(phone)) return 'O telemóvel é obrigatório.';
  if (!PT_PHONE_RE.test(phone.trim())) return 'Indica um telemóvel português válido (9 dígitos, a começar por 2 ou 9).';
  return null;
}

/** Valida um e-mail opcional: vazio é válido, presente tem de ser válido. */
function validateEmailOptional(email) {
  if (email === undefined || email === null || email === '') return null;
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return 'Indica um e-mail válido.';
  return null;
}

/** Valida um e-mail obrigatório. */
function validateEmailRequired(email) {
  if (!isNonEmptyString(email)) return 'O e-mail é obrigatório.';
  if (!EMAIL_RE.test(email.trim())) return 'Indica um e-mail válido.';
  return null;
}

/** Valida uma mensagem de texto livre entre min e max caracteres. */
function validateMessage(message, min = 10, max = 2000) {
  if (!isNonEmptyString(message)) return 'A mensagem é obrigatória.';
  const len = message.trim().length;
  if (len < min) return `A mensagem deve ter pelo menos ${min} caracteres.`;
  if (len > max) return `A mensagem não pode ter mais de ${max} caracteres.`;
  return null;
}

/** Valida o consentimento obrigatório (RGPD). */
function validateConsent(consent) {
  if (consent !== true) return 'É necessário aceitar os termos de tratamento de dados.';
  return null;
}

/** true quando o campo honeypot foi preenchido (indício de robô). */
function isHoneypotTriggered(website) {
  return typeof website === 'string' && website.trim().length > 0;
}

module.exports = {
  validateName, validatePhonePT, validateEmailOptional, validateEmailRequired,
  validateMessage, validateConsent, isHoneypotTriggered, PT_PHONE_RE, EMAIL_RE,
};
