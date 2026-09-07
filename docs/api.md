# API — ASBKI Covilhã

Referência das rotas do servidor (`server.js` + módulos em `server/`). Para o
painel de administração ver `docs/manual-cms.md`.

## Conteúdo

### `GET /api/content`
Devolve o `content.json` actual (com migração de esquemas antigos aplicada).
`Cache-Control: no-store` — o cliente decide se quer cache.

### `POST /api/content`
Requer `x-admin-token`. Corpo: o objecto de conteúdo completo.

- Valida a forma mínima do conteúdo (`server/schema.js`); em caso de erro
  devolve `400 { error, errors: string[] }`.
- Recusa publicar quando há placeholders óbvios (`a confirmar`, `a definir`,
  `000 000`, `lorem`) — devolve `400 { error, placeholders: [{path, value}] }`.
  Para publicar mesmo assim, enviar `allowPlaceholders: true` no corpo.
- Em sucesso, cria uma **nova versão** no histórico (nunca sobrescreve uma
  versão antiga) e devolve `{ ok: true }`.

### `GET /api/admin/versions`
Requer `x-admin-token`. Lista as versões guardadas (mais recente primeiro):
`[{ id, savedAt, size }]`. Mantém as últimas 30.

### `POST /api/admin/restore`
Requer `x-admin-token`. Corpo: `{ id }`. Restaura uma versão antiga —
**cria uma versão nova** com esse conteúdo (o histórico anterior fica
intacto). Devolve `{ ok: true, id, restoredFrom }` ou `404` se o id não
existir.

## Autenticação do admin

### `POST /api/admin/login`
Corpo: `{ password }`. Limitado a 10 tentativas por 15 minutos por IP.
Devolve `{ token }` (válido 8 horas) ou `401`.

A verificação da password usa `ADMIN_PASSWORD_HASH` (scrypt) quando
definida; sem ela, cai para `ADMIN_PASSWORD` em claro (compatibilidade,
regista aviso no log). Gerar um hash novo:

```
node -e "console.log(require('./server/auth').hashPassword('a-tua-password'))"
```

## Leads

### `POST /api/inscricao`
Corpo:
```json
{ "name": "...", "phone": "9XXXXXXXX", "email": "opcional",
  "sessionId": "s1", "age": 10, "guardian": "opcional",
  "consent": true, "website": "" }
```
- `website` é honeypot: se vier preenchido, responde `200 {ok:true}` sem
  gravar nada (falso positivo silencioso para bots).
- `sessionId` tem de existir em `content.schedule.sessions[].id`.
- Validação: nome 2–80 caracteres; telefone português (9 dígitos a começar
  por 2 ou 9, com ou sem `+351`); e-mail opcional mas válido se presente;
  consentimento obrigatório (`true`).
- Limitado a 5 pedidos por 10 minutos por IP → `429` acima disso.
- Em erro de validação: `400 { ok:false, errors: { campo: mensagem } }`.
- Em sucesso: `200 { ok:true, id }` — só depois de o lead estar persistido
  (o envio de e-mail é best-effort e nunca bloqueia a resposta).

### `POST /api/contacto`
Igual, com `email` obrigatório e `message` (10–2000 caracteres) em vez de
`sessionId`/`age`/`guardian`.

### `GET /api/admin/leads`
Requer `x-admin-token`. Lista todos os leads (mais recente primeiro).
Com `?format=csv`, devolve um CSV para download.

### Persistência e retenção
- Com `LEADS_BLOB_READ_WRITE_TOKEN`: Vercel Blob **privado** (`access:
  'private'`), em `leads/AAAA-MM/<id>.json`.
- Sem essa variável: disco local em `data/leads/AAAA-MM/<id>.json`
  (fora do controlo de versões).
- Retenção: 12 meses. `npm run leads:prune` apaga leads mais antigos —
  pode ser chamado por um Vercel Cron a apontar para esse script, ou
  correr manualmente / num cron do servidor.

### E-mail (Resend)
Com `RESEND_API_KEY`, `LEADS_TO_EMAIL` e `LEADS_FROM_EMAIL` definidas,
envia uma notificação em texto simples por cada lead. Sem essas
variáveis, não falha — regista `lead.email.skipped` no log e o lead
continua visível no admin.

## Uploads e imagens

- `POST /api/upload` (admin, limite 30/10min, imagem até 4 MB, apenas
  JPEG/PNG/WebP/GIF/SVG) — devolve `{ url }`.
- `DELETE /api/upload` (admin) — corpo `{ filename }` (nome local ou URL
  do Blob).
- `GET /api/images` (admin) — lista a biblioteca de imagens.

## Páginas e metadados

Todas as respostas HTML (`index.html`, `pages/*.html`) recebem, antes de
`</head>`:
- `<script id="asbki-content" type="application/json">` com o
  `content.json` actual (cache de 60s no servidor, invalidada em cada
  gravação). O cliente deve ler este bloco primeiro e só fazer `fetch` a
  `/api/content` como *fallback* — essa parte fica do lado do
  frontend (`assets/js/site.js`), ainda não migrada à data desta entrega.
- `title`, `meta description`, `canonical`, Open Graph e Twitter Card
  resolvidos a partir do conteúdo e da rota.
- JSON-LD: `SportsOrganization` (sempre), `SportsActivityLocation` (só em
  `/dojos/:slug` quando a morada não é placeholder), `NewsArticle` (em
  `/noticias/:slug`), `BreadcrumbList` (rotas com hierarquia).
- Ícones (`favicon.svg`, `icon-192.png`, `apple-touch-icon.png`,
  `site.webmanifest`) e, se `PLAUSIBLE_DOMAIN` estiver definida, o script
  do Plausible.
- Uma query string de cache-busting (`?v=<timestamp>`) em todos os
  `href`/`src` para `/assets/...`.

`/noticias/:slug`, `/dojos/:slug` e `/karate/:slug` respondem `404` (com
`pages/404.html`) quando o slug não existe no conteúdo actual. Todas as
rotas desconhecidas devolvem a mesma página 404. Erros inesperados
respondem `pages/500.html` (páginas) ou JSON sem detalhe do erro (API),
excepto com `NODE_ENV !== 'production'`, em que o detalhe é incluído para
facilitar o diagnóstico em desenvolvimento.

### Páginas legais
`/privacidade` e `/termos` são servidas a partir de `pages/legal.html`
com o corpo construído no servidor (`server/legal.js`) a partir de
`content.legal.privacidade` / `content.legal.termos` (texto simples,
parágrafos separados por linha em branco) e, na ausência de conteúdo, um
texto base em pt-PT para uma associação sem fins lucrativos. Os campos de
`content.legal.entidade` (`denominacao`, `nif`, `sede`) aparecem apenas
quando não são placeholder.

**Desvio deliberado**: o enunciado permite "HTML ou parágrafos" nesse
campo; esta implementação trata sempre o valor como texto simples (nunca
HTML em bruto), para não abrir uma via de XSS armazenado a partir do
painel de administração. Se for mesmo necessário HTML rico aqui, requer
um sanitizador dedicado (ex. `sanitize-html`) — não implementado nesta
entrega.

### sitemap.xml e robots.txt
`GET /sitemap.xml` lista as rotas estáticas mais os slugs de notícias,
dojos e disciplinas. `GET /robots.txt` permite tudo excepto `/admin` e
`/api` e aponta para o sitemap.

## Analytics (Plausible)

Com `PLAUSIBLE_DOMAIN` definida, o script do Plausible é injectado em
todas as páginas. Eventos que o **frontend** deve disparar via
`window.plausible && plausible('evento')` (ainda por implementar no
cliente à data desta entrega):

| Evento | Quando |
|---|---|
| `gate_enter` | o visitante entra na sala 3D da home |
| `door_click` | clique numa porta da sala 3D |
| `cta_trial` | clique num botão de "aula experimental" |
| `wizard_step` | avanço num passo do formulário de inscrição |
| `trial_submitted` | `POST /api/inscricao` bem sucedido |
| `contact_submitted` | `POST /api/contacto` bem sucedido |
| `tel_click` | clique num link `tel:` |
| `whatsapp_click` | clique num link do WhatsApp |

## Cabeçalhos de segurança

Aplicados a todas as respostas (`server/security.js`): `X-Content-Type-
Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options: SAMEORIGIN`, `Permissions-Policy` mínima,
`Content-Security-Policy` (`script-src`/`connect-src` incluem
`plausible.io` apenas quando `PLAUSIBLE_DOMAIN` está definida) e, em
produção (`NODE_ENV=production`), `Strict-Transport-Security`.

## Rate limiting

Implementado em memória (`server/rate-limit.js`) — por instância, não
partilhado entre instâncias serverless. Suficiente para o volume
esperado deste site; documentado como compromisso, não como limite
distribuído.

| Rota | Limite |
|---|---|
| `POST /api/admin/login` | 10 / 15 min por IP |
| `POST /api/upload` | 30 / 10 min por IP |
| `POST /api/inscricao`, `POST /api/contacto` | 5 / 10 min por IP |
