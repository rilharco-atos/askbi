#!/usr/bin/env node
/* ─── ASBKI Covilhã — auditoria de legibilidade das bandas do dojo ─────────
   Porta de review/legibility.mjs + review/legibility.py para dentro do
   repositório, sem dependência de Python: a luminância é calculada em Node
   puro (tests/lib/png.mjs, zlib nativo).

   Padrão 10k-websites: >= 3.5:1 no pior pixel sob o texto (scrim aplicado),
   medido em três posições de scroll por banda (início, meio, fim), por
   elemento de texto (kicker, cada palavra da linha, subtítulo).

   Requer um servidor já a correr (ver README — `npm start`, ou definir
   ASBKI_BASE_URL). Sai com código != 0 se alguma palavra visível (opacidade
   de banda > 0.5) ficar abaixo do limiar. */
import { launchChrome, sleep } from './lib/chrome.mjs';
import { decodePNG, relativeLuminance, worstLuminance } from './lib/png.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'artifacts', 'legibility');
mkdirSync(OUT, { recursive: true });

const BASE = (process.env.ASBKI_BASE_URL || 'http://127.0.0.1:3104').replace(/\/$/, '');
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT) || 9504;
const THRESHOLD = 3.5;

async function main() {
  const chrome = await launchChrome({ debugPort: DEBUG_PORT, width: 1440, height: 900 });
  const rows = [];

  try {
    await chrome.navigate(BASE + '/', 3500);
    const heroH = await chrome.evaluate('document.querySelector(".dojo").offsetHeight - innerHeight');
    const bands = JSON.parse(await chrome.evaluate(
      `JSON.stringify([...document.querySelectorAll('.dj-band')].map((b, i) => ({ i, a: +b.dataset.a, b: +b.dataset.b })))`
    ));

    for (const bd of bands) {
      const f = Math.min(0.02, (bd.b - bd.a) / 3);
      const positions = bd.i === 0
        ? [0, (bd.a + bd.b) / 2, bd.b - f - 0.01]
        : bd.i === bands.length - 1
          ? [bd.a + f + 0.01, (bd.a + bd.b) / 2, 1]
          : [bd.a + f + 0.01, (bd.a + bd.b) / 2, bd.b - f - 0.01];

      for (const p of positions) {
        await chrome.evaluate(`scrollTo(0, Math.round(${heroH} * ${p}))`);
        await sleep(1300);

        const zones = JSON.parse(await chrome.evaluate(`(() => {
          const b = document.querySelectorAll('.dj-band')[${bd.i}];
          const out = [];
          for (const sel of ['.dj-kicker', '.dj-line', '.dj-sub']) {
            for (const el of b.querySelectorAll(sel)) {
              if (sel === '.dj-line' && el.classList.contains('soft')) continue;
              const words = sel === '.dj-line' ? [...el.querySelectorAll('.w')] : [];
              const els = words.length ? words : [el];
              for (const w of els) {
                const r = w.getBoundingClientRect();
                if (r.width < 4 || r.height < 4) continue;
                out.push({ sel, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), color: getComputedStyle(el).color });
              }
            }
          }
          return JSON.stringify(out);
        })()`));
        const bandOpacity = Number(await chrome.evaluate(`getComputedStyle(document.querySelectorAll('.dj-band')[${bd.i}]).opacity`));

        await chrome.evaluate(`(() => {
          const st = document.createElement('style'); st.id = 'leg-hide';
          st.textContent = '.dj-band .dj-kicker, .dj-band .dj-line, .dj-band .dj-sub, .dj-band .dj-cta{opacity:0 !important}';
          document.head.appendChild(st);
        })()`);
        await sleep(120);

        const sy = await chrome.evaluate('scrollY');
        for (const [k, z] of zones.entries()) {
          const name = `band${bd.i}-p${Math.round(p * 100)}-${k}`;
          const clip = { x: z.x, y: z.y + sy, width: z.w, height: z.h, scale: 1 };
          const resp = await chrome.send('Page.captureScreenshot', { format: 'png', clip });
          if (!resp.result) continue;
          const buf = Buffer.from(resp.result.data, 'base64');
          const img = decodePNG(buf);
          const worstBg = worstLuminance(img);
          const m = z.color.match(/[\d.]+/g) || [];
          const textLum = relativeLuminance([Number(m[0] || 0), Number(m[1] || 0), Number(m[2] || 0)]);
          const hi = Math.max(textLum, worstBg), lo = Math.min(textLum, worstBg);
          const ratio = (hi + 0.05) / (lo + 0.05);
          rows.push({ name, band: bd.i, p: +p.toFixed(3), sel: z.sel, bandOpacity, ratio: +ratio.toFixed(2), w: img.width, h: img.height });
          if (ratio < THRESHOLD && bandOpacity > 0.5) writeFileSync(path.join(OUT, `${name}.png`), buf);
        }
        await chrome.evaluate(`document.getElementById('leg-hide').remove()`);
      }
    }
  } finally {
    await chrome.close();
  }

  writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(rows, null, 2));

  rows.sort((a, b) => a.band - b.band || a.p - b.p);
  let fails = 0;
  for (const r of rows) {
    const visible = r.bandOpacity > 0.5;
    const flag = r.ratio >= THRESHOLD ? 'OK ' : 'LOW';
    if (r.ratio < THRESHOLD && visible) fails++;
    console.log(`${flag} band${r.band} p=${r.p.toFixed(2)} ${r.sel.padEnd(10)} opacity=${r.bandOpacity.toFixed(2)} contrast=${r.ratio}  clip=${r.w}x${r.h}${r.ratio < THRESHOLD && visible ? '  <-- FALHA (banda visível)' : ''}`);
  }
  console.log(`\nclips medidos: ${rows.length}`);
  console.log(`falhas (banda visível, contraste < ${THRESHOLD}): ${fails}`);

  if (fails > 0) process.exit(1);
}

main().catch(err => {
  console.error('legibility: erro fatal', err);
  process.exit(1);
});
