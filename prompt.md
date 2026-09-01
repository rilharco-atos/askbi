# Prompt para o dev — corrigir o herói, a barra de menu e a secção de treinos

Cola isto no agente/IDE, com o repo `rilharco-atos/askbi` aberto.

---

Estás a trabalhar no repo `rilharco-atos/askbi` (branch `master`), um site estático de página única: `index.html`, `assets/css/style.css`, `assets/js/main.js`, conteúdo em `content.json`, painel de edição em `admin/`.

Corrige o herói (`section.hero`), a barra de menu (`nav.navbar`) e a nova secção "Treinos esta semana". Não mexas nas restantes secções. Mantém a paleta existente (`:root` em `assets/css/style.css`) e o padrão de conteúdo vindo de `content.json` — não faças hard-code de texto no HTML.

## 1. Alinhar a nav e o herói na mesma grelha

Hoje a `.navbar` e o `.hero-inner` usam contentores diferentes: o logótipo e o título nascem em linhas verticais distintas, e a nav termina antes da margem direita do conteúdo.

- Define um único contentor partilhado: `.container { max-width: 1600px; margin: 0 auto; padding: 0 80px; }` (em tablet 40px, em telemóvel 20px).
- Aplica-o a **todas** as secções: `.navbar`, `.hero-inner` e a secção "Treinos esta semana". Neste momento há três grelhas diferentes na mesma página — o `h1` do herói começa a ~230px, o logótipo a ~340px e o título "Treinos esta semana" a ~336px, e os cartões terminam a ~1560px enquanto o herói vai até à margem. Nenhuma linha vertical se repete.
- Resultado esperado: o logótipo, o eyebrow, o `h1`, o parágrafo, o primeiro botão e o título "Treinos esta semana" partilham exatamente a mesma coordenada X esquerda; o botão da nav, o link "Horário completo" e o último cartão terminam na mesma coordenada X direita.

## 2. Título em duas linhas, sem órfãs

Hoje `hero.line1/line2/line3` são três `<span>` separados por `<br>` e o texto parte em quatro linhas, deixando "anos." sozinho.

- Reduz para duas linhas: `Karate na Covilhã,` / `dos 5 aos 70 anos.`
- No CSS do `.hero-headline`: `max-width: 740px; text-wrap: balance; line-height: 1.02; letter-spacing: -0.03em;`
- Tamanho: `clamp(40px, 5.2vw, 82px)`.
- Ajusta `content.json` em conformidade (podes manter `line1`/`line2` e descartar `line3`, ou passar a um único campo `headline` — a tua escolha, desde que o `admin/` continue a editar).

## 3. Subtítulo com mais presença

- `.hero-sub`: `font-size: 19px; line-height: 1.6; max-width: 470px; color: #cfc9c1; text-wrap: pretty;`

## 4. Imagem: uma só camada, sem arestas

Hoje há três elementos sobrepostos com limites duros visíveis — `.hero-bg-img`, `.hero-slash`, `.hero-fighter` — e a figura fica cortada na base.

- Remove `.hero-slash` e `.hero-accent-glow`.
- Funde `.hero-bg-img` e `.hero-fighter` numa única imagem full-bleed ancorada à direita: `background-size: cover; background-position: center right;` a ocupar da esquerda ~44% até à margem direita da janela.
- Dissolve-a no fundo com um gradiente por cima, não com um recorte: `linear-gradient(90deg, #0d0d0d 0%, #0d0d0d 22%, rgba(13,13,13,0.72) 46%, rgba(13,13,13,0.18) 78%)`.
- A figura tem de caber inteira na altura do herói. Altura do herói: `min-height: 860px` em desktop, `min-height: 70vh` em telemóvel.
- Em telemóvel, a imagem passa a fundo do herói inteiro com overlay escuro (`rgba(13,13,13,0.72)`), e o texto fica por cima.

## 5. Botões emparelhados

- Mesma altura para os dois (`padding: 19px 32px` no primário; ajusta o secundário para compensar o `border` de 1.5px e ficarem com a mesma altura final).
- Remove o `box-shadow`/glow do botão primário.
- Secundário: `border: 1.5px solid #7a736c; color: #fff;` — o contorno atual é praticamente invisível.
- Em telemóvel: altura mínima de 44px em ambos e `width: 100%` empilhados.

## 6. Vermelho: separar preenchimento de texto

`--accent: #e31e24` sobre `--bg: #0d0d0d` dá ≈3,1:1 — falha WCAG AA para texto normal, e é o que está a ser usado no eyebrow e nas `.section-label`.

- Mantém `--accent: #e31e24` para preenchimentos (botões, ★, barras) — aí o contraste é do texto branco sobre vermelho, e passa.
- Acrescenta `--accent-text: #ff6a5e` e usa-o em todo o texto vermelho sobre fundo escuro: eyebrow do herói, `.section-label`, links de destaque.

## 7. Menu com quatro entradas

Em `content.json → nav.links`, substitui as sete entradas atuais por quatro: **Treinar**, **Modalidades**, **Associação**, **Contacto**.

Motivo: `Galeria` aponta para `#galeria`, que é a secção `.trial` (o CTA), e `Blogue` aponta para `#blogue`, que é o `<footer>`. Ambas levam o utilizador a sítios que não correspondem ao rótulo. `Início` é redundante — o logótipo já faz isso. `Horários` fica coberto pelo botão secundário do herói e por uma entrada dentro de "Treinar".

## 8. "Treinos esta semana" — o filtro não filtra

Bug funcional: com o chip **5–9 anos** ativo, continuam a aparecer os quatro cartões (Infantis 5–9, Juvenis 10–15, Adultos, Adultos). Ou o filtro está apenas decorativo, ou o handler não está ligado à lista.

- Ao clicar num chip, mostrar apenas as turmas dessa faixa etária.
- Um só chip ativo de cada vez, com estado visual claro (preenchido a `--accent`, os restantes com contorno).
- Se uma faixa não tiver turmas, mostrar uma linha de texto em vez de uma grelha vazia.
- Os chips precisam de ser `<button>` com `aria-pressed`, navegáveis por teclado — não `<div>`.

## 9. Detalhes da mesma secção

- **Sombra no título:** "Treinos esta semana" tem um `text-shadow`/relevo que nenhum outro título da página tem. Remove-o — o tipo de letra e o peso já chegam.
- **Vermelho em texto pequeno:** "Horário completo →" e as etiquetas `SEG · QUA · SEX` estão a `#e31e24` sobre preto (≈3,1:1). Passa para `--accent-text: #ff6a5e` (ver ponto 6).
- **Fundo:** a secção usa `#141414` e o herói `#0d0d0d`. A mudança lê-se como acidental. Ou usam a mesma cor, ou a diferença é assumida e maior (ex. `#0d0d0d` no herói e `#171717` na secção, com uma linha de separação a `#221f1e`).
- **Espaçamento:** há uma faixa vazia grande entre o fim do herói e o título da secção, e outra por baixo dos cartões. Uniformiza o padding vertical das secções (ex. `96px` em cima e em baixo).
- **Widget flutuante:** há um elemento cortado no canto inferior direito. Se é um chat/botão de apoio, tem de ficar dentro da janela, acima do rodapé, e não tapar o último cartão.

## Critérios de aceitação

- Em 1920px: logótipo, eyebrow, `h1`, parágrafo e primeiro botão alinhados à mesma esquerda; nav alinhada à mesma direita.
- `h1` em duas linhas, sem palavra sozinha na última.
- Nenhuma aresta reta visível na imagem do herói — só o gradiente.
- A figura da imagem não está cortada na base.
- Os dois botões do herói têm exatamente a mesma altura.
- Nenhum texto a `#e31e24` sobre fundo escuro.
- Em 360px de largura: sem scroll horizontal, botões com ≥44px de altura, `h1` legível sem zoom.
- Clicar em "10–15 anos" mostra apenas as turmas de juvenis; clicar em "5–9 anos" mostra apenas as de infantis.
- Os chips funcionam com Tab + Enter.
- O título "Treinos esta semana" alinha à esquerda com o `h1` do herói.
- Nenhum `text-shadow` em títulos.
- `content.json` continua a controlar todos os textos e a ser editável pelo `admin/`.
