/* ─── Rotas de leads: /api/inscricao e /api/contacto ─────────────────────
   Ver contrato no prompt de entrega: honeypot, validação pt-PT, rate limit
   de 5 por 10 minutos por IP, persistência (Blob privado ou disco local)
   e notificação por e-mail best-effort. */

const express = require('express');
const crypto = require('crypto');
const log = require('./log');
const { rateLimit } = require('./rate-limit');
const { saveLead, listLeads } = require('./leads-store');
const { sendLeadNotification } = require('./email');
const {
  validateName, validatePhonePT, validateEmailOptional, validateEmailRequired,
  validateMessage, validateConsent, isHoneypotTriggered,
} = require('./validators');

const leadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Demasiados pedidos a partir deste endereço. Tenta novamente dentro de alguns minutos.',
});

function sanitizeShortText(v, max) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function findSession(content, sessionId) {
  const sessions = (content.schedule && content.schedule.sessions) || [];
  return sessions.find(s => s.id === sessionId) || null;
}

/**
 * Cria o router de leads.
 * @param {object} opts
 * @param {Function} opts.authRequired middleware de autenticação do admin
 * @param {Function} opts.readContent () => Promise<object> conteúdo actual
 */
function createLeadsRouter({ authRequired, readContent }) {
  const router = express.Router();

  router.post('/api/inscricao', leadRateLimit, async (req, res) => {
    const body = req.body || {};

    if (isHoneypotTriggered(body.website)) {
      log.info('lead.honeypot', { route: 'inscricao' });
      return res.json({ ok: true, id: 'ok' }); /* falso positivo silencioso para o robô */
    }

    const errors = {};
    const nameErr = validateName(body.name); if (nameErr) errors.name = nameErr;
    const phoneErr = validatePhonePT(body.phone); if (phoneErr) errors.phone = phoneErr;
    const emailErr = validateEmailOptional(body.email); if (emailErr) errors.email = emailErr;
    const consentErr = validateConsent(body.consent); if (consentErr) errors.consent = consentErr;

    let content;
    try { content = await readContent(); }
    catch (err) { return res.status(500).json({ ok: false, error: 'Erro ao ler configuração de turmas.' }); }

    const session = findSession(content, body.sessionId);
    if (!session) errors.sessionId = 'Turma inválida ou já não disponível.';

    if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

    const id = crypto.randomUUID();
    const lead = {
      id,
      type: 'inscricao',
      createdAt: new Date().toISOString(),
      name: sanitizeShortText(body.name, 80),
      phone: sanitizeShortText(body.phone, 20),
      email: sanitizeShortText(body.email, 120) || null,
      age: Number.isFinite(Number(body.age)) ? Number(body.age) : null,
      guardian: sanitizeShortText(body.guardian, 80) || null,
      sessionId: session.id,
      sessionLabel: session.label,
      sessionLocation: session.location,
      sessionTime: `${session.daysShort} · ${session.time}`,
      ip: req.ip || null,
    };

    try {
      await saveLead(lead);
    } catch (err) {
      log.error('lead.save.failed', { route: 'inscricao', message: err.message });
      return res.status(500).json({ ok: false, error: 'Não foi possível guardar a marcação. Tenta novamente.' });
    }

    const emailResult = await sendLeadNotification({
      subject: `Nova marcação de aula experimental — ${lead.name}`,
      text: [
        `Nova marcação de aula experimental na ASBKI.`,
        ``,
        `Nome: ${lead.name}`,
        `Telemóvel: ${lead.phone}`,
        lead.email ? `E-mail: ${lead.email}` : null,
        lead.age ? `Idade: ${lead.age}` : null,
        lead.guardian ? `Encarregado de educação: ${lead.guardian}` : null,
        `Turma: ${lead.sessionLabel}`,
        `Dojo: ${lead.sessionLocation}`,
        `Horário: ${lead.sessionTime}`,
      ].filter(Boolean).join('\n'),
    });

    log.info('lead.created', { route: 'inscricao', id, emailSent: emailResult.sent });
    res.json({ ok: true, id });
  });

  router.post('/api/contacto', leadRateLimit, async (req, res) => {
    const body = req.body || {};

    if (isHoneypotTriggered(body.website)) {
      log.info('lead.honeypot', { route: 'contacto' });
      return res.json({ ok: true, id: 'ok' });
    }

    const errors = {};
    const nameErr = validateName(body.name); if (nameErr) errors.name = nameErr;
    const emailErr = validateEmailRequired(body.email); if (emailErr) errors.email = emailErr;
    if (body.phone) { const phoneErr = validatePhonePT(body.phone); if (phoneErr) errors.phone = phoneErr; }
    const messageErr = validateMessage(body.message, 10, 2000); if (messageErr) errors.message = messageErr;
    const consentErr = validateConsent(body.consent); if (consentErr) errors.consent = consentErr;

    if (Object.keys(errors).length) return res.status(400).json({ ok: false, errors });

    const id = crypto.randomUUID();
    const lead = {
      id,
      type: 'contacto',
      createdAt: new Date().toISOString(),
      name: sanitizeShortText(body.name, 80),
      email: sanitizeShortText(body.email, 120),
      phone: sanitizeShortText(body.phone, 20) || null,
      message: sanitizeShortText(body.message, 2000),
      ip: req.ip || null,
    };

    try {
      await saveLead(lead);
    } catch (err) {
      log.error('lead.save.failed', { route: 'contacto', message: err.message });
      return res.status(500).json({ ok: false, error: 'Não foi possível enviar a mensagem. Tenta novamente.' });
    }

    const emailResult = await sendLeadNotification({
      subject: `Nova mensagem de contacto — ${lead.name}`,
      text: [
        `Nova mensagem através do formulário de contacto.`,
        ``,
        `Nome: ${lead.name}`,
        `E-mail: ${lead.email}`,
        lead.phone ? `Telefone: ${lead.phone}` : null,
        ``,
        lead.message,
      ].filter(Boolean).join('\n'),
    });

    log.info('lead.created', { route: 'contacto', id, emailSent: emailResult.sent });
    res.json({ ok: true, id });
  });

  router.get('/api/admin/leads', authRequired, async (req, res) => {
    try {
      const leads = await listLeads();
      if (req.query.format === 'csv') {
        const cols = ['id', 'type', 'createdAt', 'name', 'phone', 'email', 'age', 'guardian', 'sessionLabel', 'sessionLocation', 'sessionTime', 'message'];
        const escapeCsv = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [cols.join(',')].concat(
          leads.map(l => cols.map(c => escapeCsv(l[c])).join(',')),
        ).join('\n');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
        return res.send(csv);
      }
      res.json(leads);
    } catch (err) {
      log.error('lead.list.failed', { message: err.message });
      res.status(500).json({ error: 'Erro ao listar leads' });
    }
  });

  return router;
}

module.exports = { createLeadsRouter };
