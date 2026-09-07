# Changelog — ASBKI Covilhã

Construído a partir do histórico de commits do ramo `dojo-home` (até
`9460800`, o commit base desta ronda de entrega). Agrupado por data; cada
entrada resume um ou mais commits do dia.

## 2026-09-07

- Base para a ronda de entrega: skip link, nomes das portas, entrada com
  trilho e ombreiras, interruptor de movimento (desktop sempre ligado,
  telemóvel estático), véu de regresso ao voltar ao dojo, subtítulo de
  chegada nas páginas interiores.
- Legibilidade das bandas de texto da home auditada ao pior pixel (contraste
  WCAG); portas do dojo deixam de se mover enquanto o visitante aponta para
  elas.
- Transição de porta: a porta abre-se e mostra uma pré-visualização da
  página de destino atrás das folhas de shoji, com corte para a passagem e
  chegada sem um segundo ecrã de transição.
- Entrada fechada que abre ao aproximar-se, voo de câmara pelas portas ao
  navegar, efeitos visuais nas páginas interiores (cinto da história,
  indicador de filtro, carimbo de confirmação).
- Transições de shoji entre páginas, cabeçalhos interiores com o kanji da
  secção (tokonoma), legendas discretas na sala do dojo.
- Sala do dojo: emblema na faixa de entrada, vénia de saudação, menu ligado
  diretamente às seis portas, regresso ao dojo a partir de qualquer página.
- Motion mais fluido e mais barato: legendas por projeção em vez de
  recalcular layout a cada frame, câmara suavizada, scroll próprio da sala,
  entrada com trilho guiado, texturas WebP com revelação progressiva,
  interruptor de movimento.
- Gate de dispositivo para ecrãs só de toque: tablets em modo paisagem
  recebem o hero estático em vez da sala 3D scrub-animada.

## 2026-09-03

- Novas páginas do site (dojos, notícias, karate, associação, inscrição,
  contacto e as subpáginas associadas).
- Correções pontuais de layout e conteúdo nas páginas novas.

## 2026-09-01

- Commit inicial do website ASBKI Covilhã.
- Correção de 4 vulnerabilidades de segurança identificadas no servidor.
- Redesign completo do frontend, com base numa análise de UI/UX.
- Layout ampliado (container 1200→1440px) e grid de sessões auto-fit.
- Integração de assets visuais e melhorias de imagem.
- CMS: painel de administração alinhado com as melhorias visuais do
  frontend.
- Vários ajustes ao hero da home (proporções, alinhamento, imagem do
  lutador, layout em duas linhas).
- Deploy na Vercel: rotas do `vercel.json` a apontar tudo para o servidor
  Express, ficheiros estáticos empacotados com a função serverless,
  correções de crash do servidor em produção.
- Link "Área Reservada" adicionado ao rodapé (acesso ao CMS).
- Persistência de conteúdo e uploads via Vercel Blob (com prefixo dedicado),
  versionamento por timestamp para evitar cache de CDN, `Cache-Control:
  no-store` em `/api/content`.
- Sessões de administração persistentes via JWT stateless (sobrevivem a
  redeploys, sem estado em memória).
- Site passa a ler o conteúdo sempre de `/api/content` em vez de um ficheiro
  estático embebido.
- Correções de scroll horizontal indevido em telemóvel (overflow-x, estilos
  inline do hero).
- Tema claro em telemóvel: fundo branco/bege nas secções de conteúdo, hero e
  rodapé mantêm-se escuros.

---

## [wt/qa] Evidência de QA, CI e documentação

Ramo de entrega paralela (não fundido em `dojo-home` neste changelog — ver
relatório de entrega para o detalhe completo dos commits):

- Testes de fumo do servidor (`node --test`), testes de cliente via Chrome
  headless (protocolo DevTools nativo, sem Playwright), auditoria de
  legibilidade das bandas do dojo e orçamento de performance da home.
- Gate de placeholders/travessões em `content.json` (`scripts/check-content.mjs`).
- Gerador de pré-visualizações das páginas (`scripts/previews.mjs`), portado
  do harness de referência.
- Pipeline de CI (`.github/workflows/ci.yml`) e regeneração automática de
  pré-visualizações quando o conteúdo muda (`previews.yml`).
- Documentação de handover, critérios de aceitação, checklist de
  lançamento, manutenção e baseline de QA (`docs/`).
