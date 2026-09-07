/* ─── Rate limiting em memória ─────────────────────────────────────────
   Suficiente para uma instância única. Em Vercel serverless cada instância
   tem a sua própria memória, por isso o limite é por-instância, não global;
   aceite como compromisso razoável para um site deste porte (documentado
   em docs/api.md). */

const buckets = new Map();

/* Limpa entradas expiradas periodicamente para não crescer sem limite. */
function sweep(now) {
  for (const [key, bucket] of buckets) {
    if (now - bucket.start > bucket.windowMs) buckets.delete(key);
  }
}

/**
 * Cria um middleware Express que limita pedidos por IP numa janela de tempo.
 * @param {object} opts
 * @param {number} opts.windowMs janela em milissegundos
 * @param {number} opts.max número máximo de pedidos na janela
 * @param {string} [opts.message] mensagem de erro em pt-PT
 */
function rateLimit({ windowMs, max, message = 'Demasiados pedidos. Tenta novamente mais tarde.' }) {
  return function rateLimitMiddleware(req, res, next) {
    const now = Date.now();
    if (buckets.size > 5000) sweep(now);

    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const key = `${req.baseUrl}${req.path}:${ip}`;
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0, windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.start + windowMs - now) / 1000));
      return res.status(429).json({ ok: false, error: message });
    }
    next();
  };
}

module.exports = { rateLimit };
