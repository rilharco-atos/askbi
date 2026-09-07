#!/usr/bin/env node
/* ─── ASBKI Covilhã — gerador de pré-visualizações das páginas ──────────────
   Porta de review/pages-previews.mjs para dentro do repositório. Gera
   assets/dojo/preview-<slug>.jpg para cada página de destino (o que o
   visitante vê através da porta que se abre no dojo). Corre sempre que o
   conteúdo mudar — ver .github/workflows/previews.yml.

   Requer um servidor já a correr (ver README — `npm start`, ou definir
   ASBKI_BASE_URL). Uso: node scripts/previews.mjs */
import { launchChrome, sleep } from '../tests/lib/chrome.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.ASBKI_BASE_URL || 'http://127.0.0.1:3104').replace(/\/$/, '');
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT) || 9504;
const OUT = process.env.ASBKI_PREVIEWS_DIR || path.join(__dirname, '..', 'assets', 'dojo');
const PAGES = ['associacao', 'karate', 'dojos', 'inscricao', 'noticias', 'contacto'];

async function main() {
  const chrome = await launchChrome({ debugPort: DEBUG_PORT, width: 1280, height: 800 });
  try {
    for (const slug of PAGES) {
      await chrome.navigate(`${BASE}/${slug}`, 2600);
      // A página abre atrás de uma transição shoji e tem animações de entrada:
      // remove tudo isso e pausa animações antes da captura.
      await chrome.evaluate(`(() => {
        document.querySelectorAll('.shoji').forEach(s => s.remove());
        document.querySelectorAll('.arrive-veil').forEach(s => s.remove());
        document.documentElement.classList.add('no-anim');
        const st = document.createElement('style');
        st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}';
        document.head.appendChild(st);
        scrollTo(0, 0);
        return true;
      })()`);
      await sleep(400);
      const buf = await chrome.screenshot('jpeg', 78);
      writeFileSync(path.join(OUT, `preview-${slug}.jpg`), buf);
      console.log('preview', slug, Math.round(buf.length / 1024) + ' KB');
    }
  } finally {
    await chrome.close();
  }
}

main().catch(err => {
  console.error('previews: erro fatal', err);
  process.exit(1);
});
