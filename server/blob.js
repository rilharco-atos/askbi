/* ─── Cliente Vercel Blob partilhado ────────────────────────────────────
   Usado tanto para o conteúdo (cms/content-v*.json) como para uploads de
   imagens (uploads/*). Sem ASBKI_READ_WRITE_TOKEN, `client` fica null e
   quem o usa cai para o sistema de ficheiros local. */

const BLOB_TOKEN = process.env.ASBKI_READ_WRITE_TOKEN || '';

let client = null;
try {
  if (BLOB_TOKEN) client = require('@vercel/blob');
} catch { /* pacote não instalado ou falhou — usa sistema de ficheiros local */ }

/** Acrescenta o token explícito (necessário quando o prefixo não é "BLOB"). */
function blobOpts(extra = {}) {
  return { ...extra, token: BLOB_TOKEN };
}

module.exports = { client, blobOpts, BLOB_TOKEN };
