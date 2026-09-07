#!/usr/bin/env node
/* ─── ASBKI Covilhã — orçamento de performance da home ──────────────────────
   Emula 4G lento (1.6 Mbps / 150ms RTT) e CPU 4x mais lenta, tal como um
   telemóvel médio em rede fraca. Mede peso total transferido, LCP e CLS via
   PerformanceObserver / Navigation Timing, e compara contra o orçamento.

   Requer um servidor já a correr (ver README — `npm start`, ou definir
   ASBKI_BASE_URL). Sai com código != 0 se algum orçamento não-todo falhar.
   Os valores atuais ficam registados em docs/qa/baseline.md (correr este
   script de novo sempre que a home mudar de peso). */
import { launchChrome, sleep } from './lib/chrome.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'artifacts');
mkdirSync(OUT, { recursive: true });

const BASE = (process.env.ASBKI_BASE_URL || 'http://127.0.0.1:3104').replace(/\/$/, '');
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT) || 9504;

/* Orçamento — ver docs/qa/baseline.md para a justificação de cada valor. */
const BUDGET = {
  totalWeightBytes: 1_200_000,     // até à fusão das texturas WebP (depois 900 KB)
  lcpMsNow: 4000,                  // meta atual
  lcpMsTarget: 2500,               // meta final (informativo — não bloqueia ainda)
  clsHome: 0,
};

async function main() {
  const chrome = await launchChrome({ debugPort: DEBUG_PORT, width: 1440, height: 900 });
  let result;

  try {
    // 4G lento: ~1.6 Mbps = 200 000 bytes/s, RTT 150 ms
    await chrome.setNetworkConditions({
      offline: false,
      latencyMs: 150,
      downloadThroughputBps: 1_600_000 / 8,
      uploadThroughputBps: 750_000 / 8,
    });
    await chrome.setCpuThrottle(4);

    await chrome.navigate(BASE + '/', 200); // navega já; a espera real acontece a seguir, sob throttle

    // LCP e CLS só ficam disponíveis via PerformanceObserver com buffered:true
    // (performance.getEntriesByType não os expõe de forma fiável neste Chrome
    // sem um observer ativo — descoberto ao depurar este script).
    await chrome.evaluate(`(() => {
      window.__perfCapture = { lcp: [], clsValue: 0 };
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) window.__perfCapture.lcp.push({ t: e.startTime, size: e.size });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) { /* não suportado */ }
      try {
        new PerformanceObserver(list => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__perfCapture.clsValue += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
      } catch (e) { /* não suportado */ }
    })()`);

    await sleep(9000); // tempo suficiente para assentar sob 4G lento + CPU 4x

    result = JSON.parse(await chrome.evaluate(`JSON.stringify((() => {
      const resources = performance.getEntriesByType('resource');
      const nav = performance.getEntriesByType('navigation')[0];
      const totalWeight = (nav ? nav.transferSize || 0 : 0) + resources.reduce((s, r) => s + (r.transferSize || 0), 0);
      const cap = window.__perfCapture || { lcp: [], clsValue: 0 };
      const lcp = cap.lcp.length ? cap.lcp[cap.lcp.length - 1].t : null;
      return {
        totalWeight,
        resourceCount: resources.length,
        lcp,
        cls: cap.clsValue,
        byType: resources.reduce((acc, r) => { acc[r.initiatorType] = (acc[r.initiatorType] || 0) + (r.transferSize || 0); return acc; }, {}),
      };
    })())`));
  } finally {
    await chrome.close();
  }

  writeFileSync(path.join(OUT, 'perf-report.json'), JSON.stringify({ generatedAt: new Date().toISOString(), budget: BUDGET, result }, null, 2));

  console.log('Orçamento de performance — home, 4G lento (1.6 Mbps / 150ms) + CPU 4x\n');
  console.log(`  peso total transferido : ${(result.totalWeight / 1024).toFixed(1)} KB  (orçamento: ${(BUDGET.totalWeightBytes / 1024).toFixed(0)} KB)`);
  console.log(`  recursos                : ${result.resourceCount}`);
  console.log(`  LCP                     : ${result.lcp != null ? result.lcp.toFixed(0) + ' ms' : 'não medido'}  (agora: <= ${BUDGET.lcpMsNow} ms, meta: <= ${BUDGET.lcpMsTarget} ms)`);
  console.log(`  CLS                     : ${result.cls.toFixed(3)}  (orçamento: ${BUDGET.clsHome})`);
  console.log(`  por tipo                : ${JSON.stringify(result.byType)}`);

  const failures = [];
  if (result.totalWeight > BUDGET.totalWeightBytes) failures.push(`peso total ${(result.totalWeight / 1024).toFixed(0)} KB > orçamento ${(BUDGET.totalWeightBytes / 1024).toFixed(0)} KB`);
  if (result.lcp == null) failures.push('LCP não foi medido (largest-contentful-paint sem entradas)');
  else if (result.lcp > BUDGET.lcpMsNow) failures.push(`LCP ${result.lcp.toFixed(0)} ms > orçamento atual ${BUDGET.lcpMsNow} ms`);
  if (result.cls > BUDGET.clsHome) failures.push(`CLS ${result.cls.toFixed(3)} > orçamento ${BUDGET.clsHome}`);

  if (failures.length) {
    console.error('\nFALHOU:');
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log('\naudit:perf OK — dentro do orçamento.');
}

main().catch(err => {
  console.error('perf: erro fatal', err);
  process.exit(1);
});
