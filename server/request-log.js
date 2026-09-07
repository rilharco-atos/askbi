/* ─── Log estruturado por pedido ────────────────────────────────────────
   Um requestId por pedido (cabeçalho X-Request-Id do cliente, se vier, ou
   gerado), com a duração e o status no fim. Nunca regista corpo do pedido
   nem dados pessoais. */

const crypto = require('crypto');
const log = require('./log');

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    log[level]('http.request', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
}

module.exports = { requestLogger };
