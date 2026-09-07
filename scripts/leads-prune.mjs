#!/usr/bin/env node
/* ─── Apaga leads com mais de 12 meses (retenção RGPD) ──────────────────
   Uso: npm run leads:prune
   Pode ser chamado por um Vercel Cron (vercel.json → "crons") apontando
   para um endpoint interno, ou correr manualmente / num cron do servidor. */

import leadsStore from '../server/leads-store.js';

const removed = await leadsStore.pruneLeads();
console.log(JSON.stringify({ level: 'info', event: 'leads.pruned', removed, time: new Date().toISOString() }));
