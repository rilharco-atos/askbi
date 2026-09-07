# Baseline de QA — ramo wt/qa

Medido em 2026-09-07, commit base `9460800` (ramo `dojo-home`), Node v24.11.1,
Chrome do sistema (Windows local) e Chrome do runner `ubuntu-latest` (CI).
Servidor local em `http://127.0.0.1:3104`, `ADMIN_PASSWORD` de teste.

Atualizar sempre que a home mudar de peso visual ou o conteúdo for revisto —
correr `npm run check:content`, `npm test`, `npm run e2e` e `npm run audit` e
substituir os números abaixo.

## 1. `check:content` — gate de placeholders

**Estado: FALHA (esperado — conteúdo do cliente por finalizar).**

10 placeholders e 2 travessões em texto visível:

| Campo | Valor |
|---|---|
| `site.phone` | `"+351 275 000 000"` |
| `dojos.items[0].phone` | `"+351 275 000 000"` |
| `dojos.items[1].phone` | `"+351 275 000 000"` |
| `dojos.items[0].address` | `"Covilhã (morada a confirmar)"` |
| `dojos.items[1].address` | `"Tortosendo, Covilhã (morada a confirmar)"` |
| `instructors.items[0..2].name` | `"Nome a confirmar"` (3 instrutores) |
| `events.items[4].location` | `"A confirmar"` |
| `events.items[5].location` | `"A confirmar"` |
| `about.features[2]` | travessão em `"Sem mensalidades mínimas — paga só o que treinas"` |
| `inscription.step3Text` | travessão em `"Confirmamos por SMS em 24h. Sem compromisso — ..."` |

Ação: o clube precisa de fornecer telefone e moradas reais dos dois dojos e os
nomes dos instrutores; os dois textos com travessão precisam de reescrita sem
esse carácter (convenção de estilo do projeto).

## 2. `npm test` (smoke, servidor)

**Estado: PASSA.** 43 testes — 26 a passar, 0 a falhar, 17 `todo` (contratos
de outros agentes, ver lista abaixo).

Todo (motivo, desbloqueia com a fusão):
- 404 real em `/noticias/:slug` e `/dojos/:slug` inexistentes (hoje sempre 200 — validação de slug no servidor)
- Cabeçalhos de segurança (nosniff, Referrer-Policy, X-Frame-Options, CSP, sem X-Powered-By) — nenhum presente hoje
- `/robots.txt`, `/sitemap.xml` — 404 hoje
- `/favicon.ico` — 204 hoje (placeholder sem ícone real)
- `<script id="asbki-content">` no head de `/` e `/karate` — ausente hoje
- `og:image` absoluto e `<link rel="canonical">` por rota — só `/` tem og:image (relativo); nenhuma rota tem canonical
- `POST /api/inscricao` e `POST /api/contacto` (validação, honeypot, rate limit 429) — endpoints inexistentes hoje (404)
- `/privacidade`, `/termos` — 404 hoje (páginas não existem)
- gate de placeholders em `content.json` (repete o resultado da secção 1, aqui como todo por ser bloqueado por conteúdo do cliente)

## 3. `npm run e2e` (cliente)

**Estado: 1 falha real, resto passa.** 56 verificações — 52 a passar, 1 a
falhar, 3 `todo`.

**Falha real (bug de CSS, não contrato em falta):**
`contraste .card-title em /karate >= 4,5:1` → contraste medido **1,20:1**.
O texto do título de disciplina (`.discipline-card .card-title`) tem cor clara
fixa (`#ece8e1`, definida em `assets/css/shoji.css:119`, regra
`.surface-paper .discipline-card .card-title`) mas o cartão não tem imagem de
fundo nem cor escura — fica sobre o fundo claro (`rgb(255,253,249)`) do papel
da secção. Texto quase invisível. **Não é meu ficheiro** (`assets/css/**`) —
sinalizado para o agente responsável pelas páginas/CSS.

Todo (CLS ainda não gate por falta de threshold acordado por página):
- CLS em `/karate`: 0,472
- CLS em `/dojos`: 0,461
- CLS em `/noticias`: 0,086 (dentro do orçamento — já ok)

Tudo o resto passa: `scrubOn` correto por viewport, seis portas clicáveis e
navegáveis (testado com `/karate` e `/noticias`), telemóvel só pede
`hero-poster-1280.jpg`, zero erros de consola em todas as 11 rotas × 2
viewports, header e rodapé presentes em todas as páginas, skip link é o
primeiro elemento focável.

## 4. `npm run legibility` (bandas do dojo)

**Estado: 2 falhas reais.** 48 clips medidos (4 bandas × 3 posições de scroll
× elementos de texto), **2 abaixo de 3,5:1** com a banda visível (opacidade
1.0):

| Clip | Contraste (2 execuções) | Situação |
|---|---|---|
| `band3-p87-...dj-line` (3ª linha) | 2,81:1 – 3,17:1 | banda 3, logo a seguir à transição de entrada (p=0,87) |
| `band3-p87-dj-sub` | 3,27:1 – 3,39:1 | idem |

A 5 pontos percentuais de scroll mais tarde (p=0,92) o mesmo texto já mede
~11:1 nas duas execuções — a queda é uma janela curta perto do início da
última banda, não um problema constante, mas é reprodutível. Ficheiro `dojo.css`/`dojo.js` não é meu —
sinalizado para quem ajusta as bandas do dojo (ver secção de riscos no
relatório final).

## 5. `npm run perf` (orçamento de performance da home)

**Condições**: 4G lento (1,6 Mbps / 150 ms RTT) + CPU 4x mais lenta, 9 s de
assentamento.

| Métrica | Medido | Orçamento agora | Orçamento meta | Estado |
|---|---|---|---|---|
| Peso total transferido | 1042 KB (estável entre execuções) | 1200 KB | 900 KB (pós-WebP) | dentro do orçamento atual, acima da meta final |
| LCP | 7,7 s – 11,4 s (3 execuções, varia com a máquina) | 4000 ms | 2500 ms | **FALHA** em todas as execuções |
| CLS (home) | 0,000 | 0 | 0 | ok |

O maior custo são as seis texturas da sala (`ceiling.jpg` 76 KB, `floor.jpg`
208 KB, `left.jpg` 117 KB, `right.jpg` 127 KB, `back.jpg` 90 KB) mais o
`hero-poster.jpg` (234 KB) — 852 KB só em imagens, antes da fusão das
texturas para WebP mencionada na arquitetura. Sob 4G lento isto empurra o LCP
muito acima do orçamento. Risco de fusão: a otimização de imagens (WebP,
provavelmente com `srcset`/dimensões menores) não está neste ramo — sem ela,
`npm run audit` e o Lighthouse CI continuam vermelhos.

## 6. Cabeçalhos e infraestrutura (referência rápida)

```
GET /            → 200, X-Powered-By: Express (sem cabeçalhos de segurança)
GET /robots.txt  → 404
GET /sitemap.xml → 404
GET /favicon.ico → 204
GET /rota-inexistente     → 404 real (pages/404.html)
GET /noticias/nao-existe  → 200 (não valida o slug no servidor)
GET /privacidade, /termos → 404 (páginas não existem)
GET /modalidades          → 301 → /karate
GET /modalidades/algures  → 301 → /karate (não preserva o subcaminho — comportamento atual do server.js)
POST /api/inscricao, /api/contacto → 404 (endpoints não existem)
```
