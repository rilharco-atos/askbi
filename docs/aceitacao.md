# Critérios de aceitação — ASBKI Covilhã

Critérios mensuráveis para a direção do clube (ou quem decidir pelo cliente)
aceitar a entrega. Cada critério indica como se verifica e o estado atual
conhecido (ver `docs/qa/baseline.md` para os números completos).

| # | Critério | Como verificar | Estado no ramo `wt/qa` |
|---|---|---|---|
| 1 | LCP <= 2,5 s e CLS 0 na home, sob 4G lento | `npm run perf` (automatizado, ver `tests/perf.mjs`) | **não cumprido**: LCP medido em 11,4 s sob 4G lento — depende da otimização de imagens (WebP) ainda por fazer |
| 2 | Axe (ou equivalente) sem violações A/AA | Lighthouse CI (`categories:accessibility >= 0.95`, `lighthouserc.json`) | **não cumprido**: bug de contraste confirmado em `.card-title` de `/karate` (1,20:1, ver baseline) — falha o critério de acessibilidade |
| 3 | E-mail de lead recebido na caixa do clube | Submeter os formulários de inscrição e contacto reais em produção e confirmar receção em `LEADS_TO_EMAIL` | **por implementar**: `/api/inscricao` e `/api/contacto` ainda não existem neste ramo |
| 4 | Restauro de versão no CMS testado pela direção | A direção do clube grava uma alteração, depois restaura uma versão anterior via `/admin`, e confirma que o conteúdo volta ao esperado | **por verificar manualmente** — o mecanismo de versões existe no servidor (mantém as últimas 5 versões no Blob, ou cópias `content.backup-*.json` localmente) mas não foi testado pela direção |
| 5 | 404/500 com marca | `curl` a uma rota inexistente e a uma que force erro 500; confirmar que a página tem a identidade visual do site, não a página de erro genérica do Node/Vercel | 404 cumprido (`pages/404.html`, testado em `tests/smoke.test.mjs`); 500 com marca não verificado |
| 6 | Cross-browser com capturas em Chrome, Firefox, Safari e iPad | Capturas manuais das rotas principais nos quatro ambientes | **por fazer** — os testes automatizados deste ramo só cobrem Chromium (headless via CDP); Firefox, Safari e iPad exigem verificação manual ou um serviço de cross-browser testing |

## Notas sobre os critérios não cumpridos

Os critérios 1, 2 e 3 dependem de trabalho fora do âmbito desta entrega
(otimização de imagens, correção de CSS de outro agente, e implementação do
backend de leads). Não foram inventados como cumpridos — ficam aqui como
lacunas explícitas, com o que os desbloqueia:

- **Critério 1**: fusão das texturas WebP (ver arquitetura) + `srcset` para
  imagens da home.
- **Critério 2**: correção de `assets/css/shoji.css:119` (cor do
  `.card-title` sobre fundo claro) — ver `docs/qa/baseline.md`, secção 3.
- **Critério 3**: implementação de `POST /api/inscricao` e `POST
  /api/contacto` com envio de e-mail via Resend — ver `docs/qa/baseline.md`,
  secção 2, lista de `todo`.

Os critérios 4 e 6 exigem uma ação humana (a direção do clube, ou alguém com
acesso a Safari/iPad) e não podem ser fechados só com testes automatizados.
