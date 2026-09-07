# Fontes self-hosted — o que falta ligar

O chrome (`assets/css/style.css`) já define `@font-face` para Archivo, Source
Sans 3 e JetBrains Mono a partir de ficheiros locais em `assets/fonts/*.woff2`
(latin + latin-ext, subconjunto pedido a `fonts.googleapis.com` com um
user-agent moderno, para obter só woff2). Falta a parte que só o servidor e as
páginas HTML podem fazer.

## 1. Preload nas páginas (via server.js)

Nas páginas onde o título (Archivo 800) e o texto de corpo (Source Sans 3
400) aparecem logo no primeiro ecrã — praticamente todas — adicionar antes de
`</head>`:

```html
<link rel="preload" href="/assets/fonts/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/source-sans-3-latin.woff2" as="font" type="font/woff2" crossorigin>
```

Se a maior parte do público for de utilizadores com diacríticos fora do
latin básico (não é o caso esperado em pt-PT, mas fica registado), pré-carregar
também as variantes `-latin-ext`. Por omissão, só as duas de latin chegam a
tempo de pintar o primeiro ecrã — o latin-ext entra por trás, via
`unicode-range`, só se o texto precisar de um carácter fora do latin básico.

## 2. Remover de cada página HTML (pages/*.html e index.html)

Cada página ainda traz o `<link>` directo ao Google Fonts. Com os
`@font-face` locais em `style.css`, este pedido a terceiros deixou de ser
necessário — e continuar a fazê-lo anula o ganho de RGPD (sem pedido à
Google) e de performance (sem handshake extra a `fonts.googleapis.com` /
`fonts.gstatic.com`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
```

Estas três linhas aparecem em `index.html` e em todos os `pages/*.html`
excepto `404.html` (já removido nesta ronda). Não são ficheiros que eu possa
editar neste worktree (ownership do agente do servidor/páginas) — ficam aqui
identificadas para essa fusão.

Não havia `@import` duplicado a remover em `style.css` — só existia o único
`@import` de topo, que esta ronda já substituiu pelos `@font-face` locais.

## 3. Pesos: font-weight 900 não existe nos ficheiros locais

Os `@font-face` locais só cobrem `font-weight: 400 800` (é o que os
ficheiros da Archivo pedidos à Google contêm). Havia um `font-weight: 900`
em `style.css` (`.inscription-kanji`) — corrigido nesta ronda para 800.

Ficam por corrigir (fora do meu ownership — `assets/css/pages.css`, não
edito): quatro ocorrências de `font-weight: 900` nos kanjis decorativos de
fundo (`.kids-visual .kanji` e mais três selectores, linhas ~353, 366, 478,
484). Num navegador que não tenha a Archivo local, "900" cai num peso do
sistema mais parecido com negrito extra e ainda funciona — mas não é o que
está a ser servido. Como são todos textos decorativos de baixa opacidade
(kanjis gigantes em marca de água), o impacto visual é mínimo; ainda assim,
para consistência, o ideal é trocar para 800 quando esse ficheiro for
editado.

## 4. Ficheiros entregues

```
assets/fonts/archivo-latin.woff2            35 KB
assets/fonts/archivo-latin-ext.woff2        32 KB
assets/fonts/source-sans-3-latin.woff2      28 KB
assets/fonts/source-sans-3-latin-ext.woff2  59 KB
assets/fonts/jetbrains-mono-latin.woff2     31 KB
assets/fonts/jetbrains-mono-latin-ext.woff2 11 KB
```

Total ≈ 196 KB, servidos pelo próprio `express.static` em `/assets` (já
configurado em `server.js`) — não precisa de rota nova.

## 5. Fallback com métricas ajustadas

`style.css` já regista `Archivo Fallback` (local Arial, `size-adjust: 104%`,
`ascent-override: 92%`, `descent-override: 22%`) e `Source Sans 3 Fallback`
(local Segoe UI/Arial) na cadeia de `--font-h` / `--font-b`, para o título
não saltar de tamanho enquanto a Archivo carrega (`font-display: swap`).
