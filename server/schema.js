/* ─── Validação mínima do conteúdo do CMS ──────────────────────────────
   Não valida o esquema completo (seria frágil face a novas chaves), mas
   garante que a forma das secções principais é a esperada e que não há
   funções nem tipos inesperados a entrar no content.json. */

const REQUIRED_OBJECT_SECTIONS = [
  'site', 'nav', 'hero', 'schedule', 'events', 'classes',
  'about', 'dojos', 'news', 'inscription', 'trial', 'contact', 'footer', 'karate',
];

const REQUIRED_ARRAY_SECTIONS = ['benefits'];

const REQUIRED_ARRAY_PATHS = [
  ['nav', 'links'],
  ['schedule', 'sessions'],
  ['schedule', 'filters'],
  ['dojos', 'items'],
  ['news', 'items'],
  ['karate', 'disciplines'],
];

/** Placeholder óbvio deixado por engano em produção (morada, telefone, texto genérico). */
const PLACEHOLDER_RE = /a confirmar|a definir|000 000|lorem/i;

function getAt(obj, pathArr) {
  return pathArr.reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
}

/** Percorre um valor recursivamente e recolhe as strings que batem com PLACEHOLDER_RE. */
function collectPlaceholders(value, trail, out) {
  if (typeof value === 'string') {
    if (PLACEHOLDER_RE.test(value)) out.push({ path: trail.join('.'), value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectPlaceholders(v, [...trail, i], out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) collectPlaceholders(value[k], [...trail, k], out);
  }
}

/**
 * Valida a forma mínima do content.json submetido.
 * @param {any} content
 * @returns {{ok: boolean, errors: string[]}}
 */
function validateContent(content) {
  const errors = [];
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { ok: false, errors: ['O conteúdo tem de ser um objeto JSON.'] };
  }

  for (const key of REQUIRED_OBJECT_SECTIONS) {
    const v = content[key];
    if (v === undefined) { errors.push(`Secção em falta: "${key}".`); continue; }
    if (typeof v !== 'object' || Array.isArray(v)) errors.push(`"${key}" devia ser um objeto.`);
  }

  for (const key of REQUIRED_ARRAY_SECTIONS) {
    const v = content[key];
    if (v !== undefined && !Array.isArray(v)) errors.push(`"${key}" devia ser uma lista.`);
  }

  for (const p of REQUIRED_ARRAY_PATHS) {
    const v = getAt(content, p);
    if (v !== undefined && !Array.isArray(v)) errors.push(`"${p.join('.')}" devia ser uma lista.`);
  }

  /* Sem funções, símbolos ou outros tipos que não sobrevivem a JSON.stringify/parse */
  try {
    const roundTrip = JSON.parse(JSON.stringify(content));
    if (JSON.stringify(roundTrip) !== JSON.stringify(content)) {
      errors.push('O conteúdo contém valores não serializáveis em JSON.');
    }
  } catch {
    errors.push('O conteúdo não é serializável em JSON.');
  }

  return { ok: errors.length === 0, errors };
}

/**
 * Procura placeholders óbvios (morada/telefone/texto por preencher) no
 * conteúdo. Usada para recusar publicar dados estruturados incompletos.
 * @param {any} content
 * @returns {{path: string, value: string}[]}
 */
function findPlaceholders(content) {
  const out = [];
  collectPlaceholders(content, [], out);
  return out;
}

/** Testa se um valor de texto é, ele próprio, um placeholder. */
function isPlaceholder(value) {
  return typeof value === 'string' && PLACEHOLDER_RE.test(value);
}

module.exports = { validateContent, findPlaceholders, isPlaceholder, PLACEHOLDER_RE };
