/* ─── Envio de e-mail via Resend ─────────────────────────────────────────
   Sem RESEND_API_KEY definida, não falha: regista um aviso e continua
   (o lead fica na mesma guardado e visível no admin). A região UE fica
   configurada do lado da conta Resend, não há parâmetro aqui. */

const log = require('./log');

/**
 * Envia um e-mail de notificação de lead. Nunca lança — devolve
 * {sent: boolean, skipped?: boolean, error?: string}.
 * @param {{subject: string, text: string}} opts
 */
async function sendLeadNotification({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY || '';
  const to = process.env.LEADS_TO_EMAIL || '';
  const from = process.env.LEADS_FROM_EMAIL || '';

  if (!apiKey || !to || !from) {
    log.warn('lead.email.skipped', {
      reason: !apiKey ? 'sem RESEND_API_KEY' : 'sem LEADS_TO_EMAIL/LEADS_FROM_EMAIL',
    });
    return { sent: false, skipped: true };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      log.warn('lead.email.failed', { status: res.status, body: body.slice(0, 300) });
      return { sent: false, error: `resend ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    log.warn('lead.email.error', { message: err.message });
    return { sent: false, error: err.message };
  }
}

module.exports = { sendLeadNotification };
