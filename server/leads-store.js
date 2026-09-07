/* ─── Persistência de leads ──────────────────────────────────────────────
   Os leads contêm dados de menores (idade, encarregado de educação) — por
   isso NUNCA usam o store público de uploads. Com LEADS_BLOB_READ_WRITE_TOKEN
   definida, gravam em Vercel Blob privado (região UE, conta Resend também
   configurada para UE); sem ela, em disco local (data/leads/, fora do git). */

const fs = require('fs');
const path = require('path');

const LEADS_TOKEN = process.env.LEADS_BLOB_READ_WRITE_TOKEN || '';
let blobClient = null;
try {
  if (LEADS_TOKEN) blobClient = require('@vercel/blob');
} catch { /* usa disco local */ }

const LOCAL_DIR = path.join(__dirname, '..', 'data', 'leads');
const RETENTION_MONTHS = 12;

function monthKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function leadsOpts(extra = {}) {
  return { ...extra, token: LEADS_TOKEN };
}

/**
 * Grava um lead persistido. @param {object} lead objecto já validado, com `id`, `type`, `createdAt`.
 */
async function saveLead(lead) {
  const key = `leads/${monthKey(new Date(lead.createdAt))}/${lead.id}.json`;
  const json = JSON.stringify(lead, null, 2);
  if (blobClient) {
    await blobClient.put(key, json, leadsOpts({
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
    }));
  } else {
    const dir = path.join(LOCAL_DIR, monthKey(new Date(lead.createdAt)));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${lead.id}.json`), json, 'utf-8');
  }
}

/** Lista todos os leads guardados (mais recente primeiro). Usado pelo admin. */
async function listLeads() {
  if (blobClient) {
    const { blobs } = await blobClient.list(leadsOpts({ prefix: 'leads/' }));
    const items = await Promise.all(blobs.map(async b => {
      const r = await fetch(b.url);
      return r.json();
    }));
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  if (!fs.existsSync(LOCAL_DIR)) return [];
  const items = [];
  for (const month of fs.readdirSync(LOCAL_DIR)) {
    const monthDir = path.join(LOCAL_DIR, month);
    if (!fs.statSync(monthDir).isDirectory()) continue;
    for (const file of fs.readdirSync(monthDir)) {
      if (!file.endsWith('.json')) continue;
      try { items.push(JSON.parse(fs.readFileSync(path.join(monthDir, file), 'utf-8'))); }
      catch { /* ficheiro corrompido — ignora */ }
    }
  }
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/** Apaga leads com mais de RETENTION_MONTHS meses. Devolve quantos foram removidos. */
async function pruneLeads(retentionMonths = RETENTION_MONTHS) {
  const cutoff = Date.now() - retentionMonths * 30 * 24 * 60 * 60 * 1000;
  let removed = 0;
  if (blobClient) {
    const { blobs } = await blobClient.list(leadsOpts({ prefix: 'leads/' }));
    for (const b of blobs) {
      if (new Date(b.uploadedAt).getTime() < cutoff) {
        await blobClient.del(b.url, leadsOpts());
        removed += 1;
      }
    }
    return removed;
  }
  if (!fs.existsSync(LOCAL_DIR)) return 0;
  for (const month of fs.readdirSync(LOCAL_DIR)) {
    const monthDir = path.join(LOCAL_DIR, month);
    if (!fs.statSync(monthDir).isDirectory()) continue;
    for (const file of fs.readdirSync(monthDir)) {
      const full = path.join(monthDir, file);
      if (fs.statSync(full).mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed += 1;
      }
    }
  }
  return removed;
}

module.exports = { saveLead, listLeads, pruneLeads };
