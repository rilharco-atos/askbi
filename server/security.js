/* ─── Cabeçalhos de segurança e CSP ─────────────────────────────────────
   Sem dependências externas (sem helmet) — o conjunto de cabeçalhos é
   pequeno e fica mais fácil de auditar escrito à mão. */

const PLAUSIBLE_ENABLED = Boolean(process.env.PLAUSIBLE_DOMAIN);

/* script-src e connect-src ganham plausible.io apenas quando o analytics
   está ativo (PLAUSIBLE_DOMAIN definida) — ver server/analytics.js. */
function buildCsp() {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${PLAUSIBLE_ENABLED ? ' https://plausible.io' : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https:",
    "frame-src https://maps.google.com https://www.google.com",
    `connect-src 'self'${PLAUSIBLE_ENABLED ? ' https://plausible.io' : ''}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

const CSP = buildCsp();

/**
 * Middleware Express que aplica cabeçalhos de segurança HTTP a todas as
 * respostas: HSTS (só em produção, exige HTTPS), nosniff, referrer policy,
 * permissions policy mínima, X-Frame-Options e Content-Security-Policy.
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
  next();
}

module.exports = { securityHeaders, CSP };
