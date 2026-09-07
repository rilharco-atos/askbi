# ASBKI Covilhã — Website com CMS

Site da Associação Shotokan Karatedo Beira Interior (ASBKI), Covilhã. Página
inicial com uma sala de dojo em 3D navegável por scroll (seis portas = seis
páginas), CMS próprio para o clube editar conteúdo sem tocar em código, e
formulários de contacto e inscrição.

## Arquitetura (15 linhas)

- **Servidor**: Express (`server.js`), uma única app que serve páginas
  estáticas, uma API de conteúdo (`/api/content`) e um CMS de administração
  (`/admin`). Sem framework de rendering — HTML servido tal como está.
- **Conteúdo**: `content.json` na raiz é a fonte de verdade. O CMS grava-o
  (localmente ou no Vercel Blob, se `BLOB_READ_WRITE_TOKEN` estiver definido).
  As páginas fazem `fetch('/api/content')` no cliente e renderizam-se a partir
  daí — arquitetura CSR (client-side rendering), não SSR.
- **Migração de esquema**: `server.js` versiona o conteúdo (`schemaVersion`) e
  migra automaticamente conteúdo antigo (menus, rotas, dojos placeholder) para
  o esquema atual ao ler.
- **Páginas**: ficheiros HTML estáticos em `pages/*.html`, cada um com
  `<body data-page="...">` e um `<script>` que chama `ASBKI.boot(renderFn)`
  (`assets/js/site.js`) — header, rodapé e conteúdo da página vêm todos do
  JSON carregado no cliente.
- **Home (`index.html`)**: sala de dojo em 3D com scroll-scrubbing
  (`assets/js/dojo.js` + `assets/js/home.js`), seis portas que levam às seis
  secções principais. O movimento fica sempre ligado no desktop (decisão do
  cliente); em telemóvel o hero é estático (uma só imagem).
- **Uploads**: `multer` em memória → `assets/images/uploads/` local, ou
  Vercel Blob em produção.
- **Deploy**: Vercel (branch `dojo-home`, repo `rilharco-atos/askbi`), ver
  `vercel.json`.

## Como correr localmente

```bash
npm ci
cp .env.example .env   # e ajusta ADMIN_PASSWORD
npm start              # ou: npm run dev (com --watch)
```

O site fica em `http://localhost:3000` (ou a porta de `PORT`), o CMS em
`/admin`.

## Testes e QA

```bash
npm run check:content   # gate de placeholders/travessões em content.json
npm test                 # testes de fumo do servidor (node --test)
npm start                # noutro terminal — testes seguintes precisam do servidor a correr
npm run e2e              # testes de cliente (Chrome headless via CDP)
npm run audit             # legibilidade das bandas do dojo + orçamento de performance
npm run previews          # regenera assets/dojo/preview-*.jpg
```

Os testes de cliente/auditoria assumem o servidor já a correr em
`http://127.0.0.1:3104` (variável `ASBKI_BASE_URL`) e usam a porta de
debugging de Chrome `9504` (`CHROME_DEBUG_PORT`). O executável do Chrome é
resolvido por `CHROME_PATH`, ou os caminhos habituais do Windows/Linux — ver
`tests/lib/chrome.mjs`.

Ver `docs/qa/baseline.md` para os valores medidos mais recentes e
`.github/workflows/ci.yml` para o pipeline completo.

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (default 3000) | Porta do servidor local |
| `SITE_URL` | recomendada | URL pública do site (usada em metadados/sitemap quando implementado) |
| `ADMIN_PASSWORD` | sim, para o CMS | Password em texto simples do `/admin` (comparação direta) |
| `ADMIN_PASSWORD_HASH` | alternativa a `ADMIN_PASSWORD` | Hash da password, se preferires não a guardar em claro |
| `BLOB_READ_WRITE_TOKEN` | não (senão usa disco local) | Token do Vercel Blob para conteúdo e uploads |
| `LEADS_BLOB_READ_WRITE_TOKEN` | não | Token do Vercel Blob dedicado a leads (inscrição/contacto), se separado do anterior |
| `RESEND_API_KEY` | para envio de e-mail de leads | Chave da API Resend |
| `LEADS_TO_EMAIL` | para envio de e-mail de leads | Caixa de e-mail do clube que recebe os leads |
| `LEADS_FROM_EMAIL` | para envio de e-mail de leads | Remetente autorizado no Resend |
| `PLAUSIBLE_DOMAIN` | não | Domínio configurado no Plausible Analytics, se usado |

Nunca commitar `.env` — ver `.gitignore`. `.env.example` documenta o mínimo
para correr localmente.

## Deploy (Vercel)

- Branch `dojo-home` do repositório `rilharco-atos/askbi` liga-se ao projeto
  Vercel.
- `vercel.json` define o build (`@vercel/node` sobre `server.js`) e os
  ficheiros incluídos (`index.html`, `content.json`, `pages/**`, `assets/**`,
  `admin/**`).
- Todas as rotas são servidas por `server.js` (`routes: [{ src: "/(.*)",
  dest: "/server.js" }]`) — é o Express que decide o que devolver.
- Configurar as variáveis de ambiente acima no painel do projeto Vercel antes
  do primeiro deploy de produção (ver `docs/checklist-lancamento.md`).

## Decisões de produto registadas

- **Movimento sempre ligado no desktop**: decisão do cliente — a sala 3D
  scrub-anima sempre no ecrã grande, mesmo com `prefers-reduced-motion:
  reduce` (ver `tests/e2e.mjs`, teste de scrubOn, e `review/harness2.mjs`,
  bloco "REDUCE").
- **Hero estático em telemóvel**: por performance — só `hero-poster-1280.jpg`
  é pedido de `assets/dojo/` em ecrãs móveis, sem a cena 3D scrub-animada.
- **Seis portas = seis páginas**: a navegação principal da home é a própria
  sala do dojo — cada porta é um link real (`<a class="dj-door" href="...">`)
  para uma das seis secções principais.

## Estrutura de testes e scripts (propriedade desta entrega)

```
tests/
  lib/chrome.mjs       cliente CDP partilhado (zero dependências)
  lib/png.mjs           descodificador PNG + cálculo de contraste WCAG
  smoke.test.mjs        testes de fumo do servidor (node --test)
  e2e.mjs                testes de cliente (Chrome headless)
  legibility.mjs         auditoria de legibilidade das bandas do dojo
  perf.mjs               orçamento de performance da home
  artifacts/             capturas e relatórios JSON (gitignored)
scripts/
  check-content.mjs      gate de placeholders/travessões em content.json
  previews.mjs           gera assets/dojo/preview-*.jpg
.github/workflows/
  ci.yml                 pipeline principal (testes + auditorias + Lighthouse)
  previews.yml           regenera pré-visualizações quando content.json muda
docs/
  qa/baseline.md         valores medidos mais recentes
  handover.md, aceitacao.md, checklist-lancamento.md, manutencao.md
```
