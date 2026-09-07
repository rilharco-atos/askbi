#!/usr/bin/env node
/* ─── ASBKI Covilhã — gate de placeholders em content.json ─────────────────
   Percorre todos os campos de texto de content.json à procura de:
     - placeholders óbvios ("000 000", "a confirmar", "lorem ipsum", "TODO",
       "xxx", "TBD")
     - travessões (—) em texto visível, por convenção de estilo do projeto

   Sai com código 1 e a lista de campos quando encontra alguma ocorrência.
   Uso: node scripts/check-content.mjs   (ou `npm run check:content`) */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_FILE = path.join(__dirname, '..', 'content.json');

const PLACEHOLDER_PATTERNS = [
  { name: '"000 000"', re: /000\s*000/ },
  { name: '"a confirmar"', re: /a confirmar/i },
  { name: '"lorem ipsum"', re: /lorem ipsum/i },
  { name: '"TODO"', re: /\bTODO\b/ },
  { name: '"TBD"', re: /\bTBD\b/ },
  { name: '"xxx"', re: /\bxxx+\b/i },
];

const DASH_RE = /—/;

/** Campos que não são texto de visitante (URLs, IDs, chaves técnicas) — não entram no gate de travessões. */
const NON_VISIBLE_KEY_RE = /^(href|slug|id|key|link|icon|image|backgroundImage|foregroundImage|logo|path|type|status|group|schemaVersion)$/i;

function collect(node, keyPath, patterns, sink) {
  if (node == null) return;
  if (typeof node === 'string') {
    const key = keyPath[keyPath.length - 1] || '';
    for (const p of patterns.placeholders) {
      if (p.re.test(node)) sink.placeholders.push({ path: keyPath.join('.'), pattern: p.name, value: node });
    }
    if (!NON_VISIBLE_KEY_RE.test(String(key).replace(/\[\d+\]$/, '')) && DASH_RE.test(node)) {
      sink.dashes.push({ path: keyPath.join('.'), value: node });
    }
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((v, i) => collect(v, [...keyPath.slice(0, -1), `${keyPath[keyPath.length - 1] || ''}[${i}]`], patterns, sink));
    return;
  }
  if (typeof node === 'object') {
    for (const k of Object.keys(node)) collect(node[k], [...keyPath, k], patterns, sink);
  }
}

function main() {
  let content;
  try {
    content = JSON.parse(readFileSync(CONTENT_FILE, 'utf-8'));
  } catch (err) {
    console.error(`Não foi possível ler ${CONTENT_FILE}: ${err.message}`);
    process.exit(1);
  }

  const sink = { placeholders: [], dashes: [] };
  collect(content, [], { placeholders: PLACEHOLDER_PATTERNS }, sink);

  let failed = false;

  if (sink.placeholders.length) {
    failed = true;
    console.error(`\nPlaceholders encontrados em content.json (${sink.placeholders.length}):`);
    for (const p of sink.placeholders) {
      console.error(`  - ${p.path}  [${p.pattern}]  ${JSON.stringify(p.value)}`);
    }
  }

  if (sink.dashes.length) {
    failed = true;
    console.error(`\nTravessões (—) em texto visível de content.json (${sink.dashes.length}):`);
    for (const d of sink.dashes) {
      console.error(`  - ${d.path}  ${JSON.stringify(d.value)}`);
    }
  }

  if (failed) {
    console.error('\ncheck:content FALHOU. Corrige os campos acima em content.json antes de publicar.\n');
    process.exit(1);
  }

  console.log('check:content OK — nenhum placeholder ou travessão em texto visível.');
}

main();
