/* ─── Logger JSON estruturado ──────────────────────────────────────────
   Escreve uma linha JSON por evento em stdout/stderr. Nunca incluir dados
   pessoais em claro (nomes, telefones, e-mails, moradas) — usar apenas
   identificadores (id do lead, hash) quando for preciso referenciar alguém. */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

/**
 * Escreve uma entrada de log estruturada em JSON.
 * @param {'debug'|'info'|'warn'|'error'} level
 * @param {string} event identificador curto do evento, ex. "lead.created"
 * @param {object} [fields] campos adicionais (nunca PII em claro)
 */
function log(level, event, fields = {}) {
  if ((LEVELS[level] || LEVELS.info) < MIN_LEVEL) return;
  const entry = {
    level,
    event,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

module.exports = {
  debug: (event, fields) => log('debug', event, fields),
  info:  (event, fields) => log('info', event, fields),
  warn:  (event, fields) => log('warn', event, fields),
  error: (event, fields) => log('error', event, fields),
};
