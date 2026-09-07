/* ─── Páginas legais: /privacidade e /termos ────────────────────────────
   O texto vem de content.legal.privacidade / content.legal.termos quando
   existir; sem isso, usa um texto base em pt-PT correcto para uma
   associação desportiva sem fins lucrativos. Os campos de identificação
   (content.legal.entidade) só aparecem quando não são placeholder.

   Por segurança, o texto do CMS é tratado sempre como texto simples
   (parágrafos separados por linha em branco), nunca como HTML em bruto —
   isto evita XSS armazenado a partir do painel de administração; é um
   desvio deliberado face ao "HTML ou parágrafos" do enunciado, documentado
   em docs/api.md. */

const { escapeHtml } = require('./meta');
const { isPlaceholder } = require('./schema');

function paragraphsHtml(text) {
  if (Array.isArray(text)) {
    return text.map(p => `<p>${escapeHtml(p)}</p>`).join('\n');
  }
  if (typeof text !== 'string' || !text.trim()) return '';
  return text.split(/\n\s*\n/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('\n');
}

function entidadeHtml(entidade) {
  if (!entidade || typeof entidade !== 'object') return '';
  const rows = [];
  if (entidade.denominacao && !isPlaceholder(entidade.denominacao)) rows.push(['Denominação', entidade.denominacao]);
  if (entidade.nif && !isPlaceholder(entidade.nif)) rows.push(['NIF', entidade.nif]);
  if (entidade.sede && !isPlaceholder(entidade.sede)) rows.push(['Sede', entidade.sede]);
  if (!rows.length) return '';
  const items = rows.map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`).join('\n');
  return `<ul class="legal-entity">\n${items}\n</ul>`;
}

function defaultPrivacyText(site) {
  const email = site && site.email && !isPlaceholder(site.email) ? site.email : 'geral@asbki-covilha.pt';
  return [
    'A Associação Shotokan Karatedo Beira Interior (ASBKI) é a responsável pelo tratamento dos dados pessoais recolhidos através deste site.',
    'Os dados recolhidos nos formulários de marcação de aula experimental e de contacto (nome, telemóvel, e-mail, idade e, quando aplicável, nome do encarregado de educação) são usados exclusivamente para responder ao pedido, marcar a aula experimental e manter contacto sobre as actividades da associação. Não são vendidos nem partilhados com terceiros para fins de marketing.',
    'A base legal do tratamento é o consentimento dado no momento do envio do formulário e o interesse legítimo da associação em responder a pedidos de contacto.',
    'Os dados são conservados durante 12 meses após o último contacto, findos os quais são apagados, salvo obrigação legal de conservação mais longa.',
    `Nos termos do RGPD, tens direito a aceder, retificar, apagar ou pedir a portabilidade dos teus dados, bem como a retirar o consentimento a qualquer momento, através do e-mail ${email}.`,
  ].join('\n\n');
}

function defaultTermsText() {
  return [
    'A utilização deste site pressupõe a aceitação destes termos e condições.',
    'Os conteúdos publicados (textos, imagens, horários) são propriedade da ASBKI ou usados com autorização e destinam-se apenas a fins informativos sobre as actividades da associação.',
    'A marcação de uma aula experimental através do formulário deste site não constitui inscrição definitiva na associação; a inscrição formal é feita presencialmente no dojo.',
    'A ASBKI reserva-se o direito de alterar horários, turmas e conteúdos deste site sem aviso prévio, procurando sempre manter a informação actualizada.',
  ].join('\n\n');
}

/**
 * Constrói o HTML do corpo da página legal para "privacidade" ou "termos".
 * @param {'privacidade'|'termos'} kind
 * @param {object} content conteúdo actual
 * @returns {{title: string, bodyHtml: string}}
 */
function buildLegalPage(kind, content) {
  const legal = content.legal || {};
  const site = content.site || {};
  if (kind === 'privacidade') {
    const text = legal.privacidade || defaultPrivacyText(site);
    return {
      title: 'Política de Privacidade',
      bodyHtml: [paragraphsHtml(text), entidadeHtml(legal.entidade)].filter(Boolean).join('\n'),
    };
  }
  const text = legal.termos || defaultTermsText();
  return {
    title: 'Termos e Condições',
    bodyHtml: [paragraphsHtml(text), entidadeHtml(legal.entidade)].filter(Boolean).join('\n'),
  };
}

module.exports = { buildLegalPage };
