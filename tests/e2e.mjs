#!/usr/bin/env node
/* ─── ASBKI Covilhã — testes de cliente (Chrome headless via CDP) ──────────
   Cobre os contratos de "Cliente" da entrega de QA: scrub do dojo por
   viewport, portas clicáveis e navegáveis, imagem única em telemóvel, zero
   erros de consola em todas as rotas, header/footer presentes, skip link
   como primeiro elemento focável, e contraste do .card-title em /karate.

   Requer um servidor já a correr (ver README — `npm start`, ou definir
   ASBKI_BASE_URL). Porta de debugging do Chrome configurável via
   CHROME_DEBUG_PORT (default 9504, ver instruções de projeto).

   Produz: tests/artifacts/e2e-report.json e capturas em tests/artifacts/e2e/.
   Sai com código != 0 se algum caso (não marcado como todo) falhar. */
import { launchChrome, sleep } from './lib/chrome.mjs';
import { decodePNG, relativeLuminance, worstLuminance } from './lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(__dirname, 'artifacts', 'e2e');
mkdirSync(ARTIFACTS, { recursive: true });

const BASE = (process.env.ASBKI_BASE_URL || 'http://127.0.0.1:3104').replace(/\/$/, '');
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT) || 9504;

const ROUTES = [
  '/', '/dojos', '/noticias', '/karate', '/associacao',
  '/associacao/historia', '/associacao/orgaos-sociais',
  '/associacao/instrutores', '/associacao/dojo-kun',
  '/inscricao', '/contacto',
];

const results = [];
function record(name, ok, detail, opts = {}) {
  results.push({ name, ok, detail: detail ?? null, todo: !!opts.todo });
  const tag = opts.todo ? (ok ? 'TODO-OK' : 'TODO') : (ok ? 'PASS' : 'FAIL');
  console.log(`[${tag}] ${name}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const chrome = await launchChrome({ debugPort: DEBUG_PORT, width: 1440, height: 900 });

  try {
    /* ─── 1. scrubOn por viewport ──────────────────────────────────────── */
    await chrome.setViewport({ width: 1440, height: 900 });
    await chrome.navigate(BASE + '/', 3500);
    const scrubDesktop = await chrome.evaluate('!!(window.__dojo && window.__dojo.scrubOn)');
    record('scrubOn === true a 1440x900', scrubDesktop === true, `valor: ${scrubDesktop}`);

    await chrome.setViewport({ width: 375, height: 812, mobile: true });
    await chrome.navigate(BASE + '/', 3500);
    const scrubMobile = await chrome.evaluate('!!(window.__dojo && window.__dojo.scrubOn)');
    record('scrubOn === false a 375x812', scrubMobile === false, `valor: ${scrubMobile}`);

    /* ─── 2. Seis portas clicáveis (elementFromPoint no fim do scroll) ──── */
    await chrome.setViewport({ width: 1440, height: 900, mobile: false });
    await chrome.navigate(BASE + '/', 3500);
    const heroH = await chrome.evaluate('document.querySelector(".dojo").offsetHeight - innerHeight');
    await chrome.evaluate(`scrollTo(0, ${heroH})`);
    await sleep(1500);
    // As portas são superfícies com perspetiva: o centro geométrico da bounding
    // box nem sempre cai dentro da forma visível (jambas, folhas entreabertas).
    // Tal como o harness2 de referência, procura-se o centroide dos pontos da
    // grelha que realmente acertam na porta.
    const doorCheck = JSON.parse(await chrome.evaluate(`JSON.stringify((() => {
      const doors = [...document.querySelectorAll('.dj-door')];
      return doors.map(d => {
        const r = d.getBoundingClientRect();
        const hits = [];
        for (let j = 0.15; j <= 0.85; j += 0.1) for (let i = 0.1; i <= 0.9; i += 0.1) {
          const x = r.x + r.width * i, y = r.y + r.height * j;
          const el = document.elementFromPoint(x, y);
          if (el && el.closest('.dj-door') === d) hits.push([x, y]);
        }
        return { href: d.getAttribute('href'), clickable: hits.length > 0, hits: hits.length };
      });
    })())`));
    record('seis .dj-door presentes', doorCheck.length === 6, `encontradas: ${doorCheck.length}`);
    const notClickable = doorCheck.filter(d => !d.clickable);
    record('todas as portas são clicáveis via elementFromPoint', notClickable.length === 0,
      notClickable.length ? `falharam: ${notClickable.map(d => d.href).join(', ')}` : null);

    /* ─── 3. Clicar numa porta navega para a rota certa ─────────────────── */
    async function flyThrough(href, durationMs) {
      await chrome.navigate(BASE + '/', 2500);
      await chrome.evaluate(`scrollTo(0, ${heroH})`);
      await sleep(1200);
      // Centroide dos pontos da grelha que acertam na porta (ver nota acima
      // sobre a geometria em perspetiva) — mesma técnica do harness2.
      const aim = JSON.parse(await chrome.evaluate(`(() => {
        const d = document.querySelector('.dj-door[href="${href}"]');
        if (!d) return JSON.stringify({ miss: true });
        const r = d.getBoundingClientRect();
        const hits = [];
        for (let j = 0.15; j <= 0.85; j += 0.05) for (let i = 0.05; i <= 0.95; i += 0.05) {
          const x = r.x + r.width * i, y = r.y + r.height * j;
          const el = document.elementFromPoint(x, y);
          if (el && el.closest('.dj-door') === d) hits.push([x, y]);
        }
        if (!hits.length) return JSON.stringify({ x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), miss: true });
        const c = hits.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map(v => v / hits.length);
        return JSON.stringify({ x: Math.round(c[0]), y: Math.round(c[1]) });
      })()`));
      if (aim.miss) return { ok: false, detail: `porta ${href} não encontrada / centroide fora da forma` };
      await chrome.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: aim.x, y: aim.y });
      await sleep(700);
      await chrome.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: aim.x, y: aim.y, button: 'left', clickCount: 1 });
      await chrome.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: aim.x, y: aim.y, button: 'left', clickCount: 1 });
      await sleep(durationMs + 600);
      const finalPath = await chrome.evaluate('location.pathname');
      return { ok: finalPath === href, detail: `chegou a ${finalPath}` };
    }
    const karateNav = await flyThrough('/karate', 1900);
    record('clicar na porta Karate navega para /karate', karateNav.ok, karateNav.detail);
    const noticiasNav = await flyThrough('/noticias', 1600);
    record('clicar na porta Notícias navega para /noticias', noticiasNav.ok, noticiasNav.detail);

    /* ─── 4. Telemóvel: só hero-poster-1280.jpg pedido de assets/dojo ───── */
    await chrome.setViewport({ width: 375, height: 812, mobile: true });
    await chrome.navigate(BASE + '/', 3200);
    const dojoAssetUrls = chrome.requests
      .map(r => r.url)
      .filter(u => /\/assets\/dojo\//.test(u))
      .map(u => u.split('/').pop());
    const uniqueDojoAssets = [...new Set(dojoAssetUrls)];
    const onlyHeroPoster = uniqueDojoAssets.length > 0 && uniqueDojoAssets.every(f => f === 'hero-poster-1280.jpg');
    record('telemóvel só pede hero-poster-1280.jpg de assets/dojo', onlyHeroPoster,
      `pedidos: ${uniqueDojoAssets.join(', ') || '(nenhum)'}`);

    /* ─── 5. Zero erros de consola em todas as rotas (desktop + telemóvel) ── */
    for (const viewport of [{ width: 1440, height: 900, mobile: false }, { width: 375, height: 812, mobile: true }]) {
      await chrome.setViewport(viewport);
      for (const route of ROUTES) {
        await chrome.navigate(BASE + route, 2800);
        const errs = [...chrome.consoleErrors];
        record(`zero erros de consola em ${route} (${viewport.width}x${viewport.height})`, errs.length === 0,
          errs.length ? errs.slice(0, 3).join(' | ') : null);
      }
    }

    /* ─── 6. Header e rodapé presentes em todas as páginas ──────────────── */
    await chrome.setViewport({ width: 1440, height: 900, mobile: false });
    for (const route of ROUTES) {
      await chrome.navigate(BASE + route, 2800);
      const layout = JSON.parse(await chrome.evaluate(`JSON.stringify({
        header: !!document.querySelector('#site-header .navbar'),
        footer: !!document.querySelector('#site-footer .footer'),
      })`));
      record(`header presente em ${route}`, layout.header === true);
      record(`rodapé presente em ${route}`, layout.footer === true);
    }

    /* ─── 7. Skip link é o primeiro elemento focável ─────────────────────── */
    await chrome.navigate(BASE + '/', 3000);
    const firstFocusable = await chrome.evaluate(`(() => {
      document.body.focus();
      const el = document.activeElement;
      document.activeElement.blur && document.activeElement.blur();
      const skip = document.querySelector('.skip-link');
      if (!skip) return 'skip-link ausente';
      // Simula Tab a partir do topo do documento
      const focusables = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
        .filter(e => e.tabIndex !== -1 && e.offsetParent !== null || e === skip);
      return focusables[0] === skip ? 'ok' : (focusables[0] ? focusables[0].outerHTML.slice(0, 80) : 'nenhum focável');
    })()`);
    record('skip link é o primeiro elemento focável em /', firstFocusable === 'ok', firstFocusable);

    /* ─── 8. CLS < 0.1 nas páginas interiores (PerformanceObserver) ─────── */
    for (const route of ['/karate', '/dojos', '/noticias']) {
      await chrome.navigate(BASE + route, 200);
      const cls = await chrome.evaluate(`new Promise(resolve => {
        let value = 0;
        try {
          new PerformanceObserver(list => {
            for (const entry of list.getEntries()) if (!entry.hadRecentInput) value += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) { resolve(-1); return; }
        setTimeout(() => resolve(value), 3000);
      })`);
      record(`CLS < 0.1 em ${route}`, cls >= 0 && cls < 0.1, `CLS medido: ${cls}`, { todo: true });
    }

    /* ─── 9. Contraste do .card-title em /karate >= 4.5:1 ───────────────── */
    await chrome.setViewport({ width: 1440, height: 900, mobile: false });
    await chrome.navigate(BASE + '/karate', 3200);
    const titleBox = JSON.parse(await chrome.evaluate(`(() => {
      const el = document.querySelector('.discipline-card .card-title') || document.querySelector('.card-title');
      if (!el) return JSON.stringify({ miss: true });
      const r = el.getBoundingClientRect();
      const color = getComputedStyle(el).color;
      return JSON.stringify({ x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), color });
    })()`));
    if (titleBox.miss) {
      record('contraste .card-title em /karate >= 4.5:1', false, '.card-title não encontrado em /karate');
    } else {
      await chrome.evaluate(`(() => {
        const st = document.createElement('style'); st.id = 'contrast-hide';
        st.textContent = '.card-title{opacity:0 !important}';
        document.head.appendChild(st);
      })()`);
      await sleep(150);
      const sy = await chrome.evaluate('scrollY');
      const clip = { x: titleBox.x, y: titleBox.y + sy, width: Math.max(1, titleBox.w), height: Math.max(1, titleBox.h), scale: 1 };
      const shotResp = await chrome.send('Page.captureScreenshot', { format: 'png', clip });
      const buf = Buffer.from(shotResp.result.data, 'base64');
      writeFileSync(path.join(ARTIFACTS, 'karate-card-title-bg.png'), buf);
      await chrome.evaluate(`document.getElementById('contrast-hide').remove()`);
      const img = decodePNG(buf);
      const worstBg = worstLuminance(img); // pior caso para texto claro
      const m = titleBox.color.match(/[\d.]+/g) || [];
      const textLum = relativeLuminance([Number(m[0] || 0), Number(m[1] || 0), Number(m[2] || 0)]);
      const hi = Math.max(textLum, worstBg), lo = Math.min(textLum, worstBg);
      const ratio = (hi + 0.05) / (lo + 0.05);
      record('contraste .card-title em /karate >= 4.5:1', ratio >= 4.5, `contraste medido: ${ratio.toFixed(2)}:1`);
    }

    /* ─── captura de referência final ───────────────────────────────────── */
    await chrome.navigate(BASE + '/', 2500);
    writeFileSync(path.join(ARTIFACTS, 'home.jpg'), await chrome.screenshot('jpeg', 78));

  } finally {
    await chrome.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    results,
    summary: {
      total: results.length,
      pass: results.filter(r => r.ok && !r.todo).length,
      fail: results.filter(r => !r.ok && !r.todo).length,
      todo: results.filter(r => r.todo).length,
    },
  };
  writeFileSync(path.join(__dirname, 'artifacts', 'e2e-report.json'), JSON.stringify(report, null, 2));

  console.log(`\ne2e: ${report.summary.pass} passaram, ${report.summary.fail} falharam, ${report.summary.todo} todo (de ${report.summary.total})`);
  if (report.summary.fail > 0) {
    console.error('\nFalhas (não-todo):');
    for (const r of results.filter(r => !r.ok && !r.todo)) console.error(`  - ${r.name}${r.detail ? ': ' + r.detail : ''}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('e2e: erro fatal', err);
  process.exit(1);
});
