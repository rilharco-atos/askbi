# Checklist de lançamento — ASBKI Covilhã

Percorrer esta lista antes de anunciar o site ao clube como "no ar". Cada
item indica quem normalmente o resolve.

## Domínio e infraestrutura

- [ ] Domínio comprado/transferido e a apontar para a Vercel
- [ ] SSL ativo (automático na Vercel — confirmar o cadeado no browser)
- [ ] DNS: registo A/CNAME para a Vercel confirmado
- [ ] SPF configurado para o domínio de envio de e-mail
- [ ] DKIM configurado (Resend fornece o registo a adicionar)
- [ ] DMARC configurado (pelo menos `p=none` para monitorização inicial)
- [ ] E-mail de teste enviado através do formulário de contacto em produção e
      recebido na caixa do clube

## CMS e conteúdo

- [ ] Direção do clube treinada a usar `/admin`
- [ ] Restauro de versão anterior testado pela direção (ver
      `docs/aceitacao.md`, critério 4)
- [ ] Placeholders de `content.json` substituídos por dados reais —
      `npm run check:content` a passar (ver `docs/qa/baseline.md`, secção 1)
- [ ] Fotos finais dos dojos e instrutores carregadas (não os placeholders
      de desenvolvimento)

## SEO e motores de busca

- [ ] `sitemap.xml` publicado e a listar todas as rotas
- [ ] `sitemap.xml` submetido no Google Search Console
- [ ] `robots.txt` publicado
- [ ] Metadados por rota (title, description, og:image absoluto, canonical)
      revistos manualmente numa amostra de páginas

## Ícones e identidade visual

- [ ] `favicon.ico` real (hoje devolve 204 — placeholder, ver baseline)
- [ ] Ícones para dispositivos móveis (apple-touch-icon, etc.) presentes
- [ ] Imagem de partilha social (`og:image`) testada num validador (ex.:
      debugger de partilha do Facebook/LinkedIn)

## Legal

- [ ] Página de política de privacidade publicada (`/privacidade` — não
      existe neste ramo, ver baseline)
- [ ] Página de termos publicada (`/termos` — idem)
- [ ] Aviso de cookies/analytics, se aplicável (Plausible não usa cookies,
      mas confirmar se há outros scripts de terceiros)

## Segurança

- [ ] Cabeçalhos de segurança presentes (`X-Content-Type-Options: nosniff`,
      `Referrer-Policy`, `X-Frame-Options`, `Content-Security-Policy`) — não
      implementados neste ramo, ver baseline
- [ ] `X-Powered-By: Express` removido
- [ ] `ADMIN_PASSWORD` forte definida em produção (não o valor de exemplo do
      `.env.example`)
- [ ] Rate limiting confirmado nos formulários de leads, quando existirem

## CI e qualidade

- [ ] Pipeline de CI verde (`.github/workflows/ci.yml`) — hoje falha nos
      testes marcados como `todo` só se forem promovidos a testes reais sem
      a funcionalidade correspondente; verificar que os `todo` correspondem
      mesmo a trabalho pendente, não a regressões
- [ ] `npm run check:content` a passar (bloqueado por conteúdo real do
      cliente — ver acima)
- [ ] Lighthouse CI a cumprir os orçamentos de `lighthouserc.json` (hoje com
      `continue-on-error: true` — ver TODO datado em `ci.yml`)
- [ ] Capturas cross-browser em Chrome, Firefox, Safari e iPad das rotas
      principais (ver `docs/aceitacao.md`, critério 6)

## Vercel

- [ ] Variáveis de ambiente de produção configuradas (ver tabela em
      `README.md`)
- [ ] **Deployment Protection da Vercel desligada** para o domínio de
      produção — sem isto o cliente não consegue ver o site sem autenticação
      da Vercel
- [ ] Domínio de produção associado ao deployment correto (não a um preview)
