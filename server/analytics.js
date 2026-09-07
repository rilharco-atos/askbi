/* ─── Plausible Analytics (opcional, respeita a privacidade) ───────────
   Só é injectado quando PLAUSIBLE_DOMAIN está definida — sem a variável,
   nenhum script de analytics é carregado. Eventos disparados pelo cliente
   estão documentados em docs/api.md. */

function plausibleScriptTag() {
  const domain = process.env.PLAUSIBLE_DOMAIN || '';
  if (!domain) return '';
  return `<script defer data-domain="${domain}" src="https://plausible.io/js/script.js"></script>`;
}

module.exports = { plausibleScriptTag };
