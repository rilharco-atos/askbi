# ASBKI Covilhã — melhorias de UI/UX

Análise de `rilharco-atos/askbi@master` (commit `fb12a609dc77`), feita sobre o código: `index.html`, `content.json`, `assets/js/main.js`, `assets/css/style.css`.

**Contexto que muda tudo:** o site é uma landing page única, com todo o conteúdo em `content.json` e um painel em `admin/`. A maioria dos problemas abaixo resolve-se a editar JSON, não a escrever código. Isso torna as correções P0 questão de horas, não de sprints.

---

## P0 — Erros funcionais (corrigir esta semana)

### 1. Dois itens de menu levam a sítios errados

`content.json → nav.links` tem sete entradas. Duas apontam para âncoras que existem, mas em secções que não têm nada a ver com o rótulo:

| Rótulo no menu | Âncora | Onde aterra de facto |
| --- | --- | --- |
| Galeria | `#galeria` | `<section class="trial" id="galeria">` — o CTA "Pronto para começar a tua jornada?" |
| Blogue | `#blogue` | `<footer class="footer" id="blogue">` — o rodapé |

Quem clica em "Galeria" à espera de fotos recebe um botão de venda. Isto lê-se como site abandonado.

**Correção:** remover as duas entradas de `nav.links` até existir galeria e blogue a sério. Cinco itens no menu é melhor do que sete, dois dos quais mentem. Se a galeria é prioritária, criar `<section id="galeria">` própria — as imagens já são suportadas por `admin/`.

### 2. O botão "Ver Vídeo" não faz nada

`content.json → hero.cta2Href` é `#video`. Não existe nenhum elemento com `id="video"` no `index.html`. O botão faz scroll para nenhures.

**Correção:** ou apontar para um vídeo real (YouTube em modal/lightbox), ou remover `cta2`. Um herói com um só botão converte melhor do que um com dois, sendo um deles quebrado.

### 3. "Horários" não mostra horários

O menu promete "Horários". A secção `#horarios` renderiza `content.json → schedule.days`, que contém três linhas:

```
Segunda – Sexta   08:00 – 22:00
Sábado            09:00 – 14:00
Domingo           Fechado
```

Isto são **horas de abertura da instalação**, não horários de aulas. A pergunta nº1 de quem chega ao site — *"a que horas treina o meu filho de 8 anos, e onde?"* — não tem resposta em nenhum ponto do site.

**Correção (a maior alavanca deste documento):** trocar `schedule` por uma lista de turmas. Estrutura sugerida para `content.json`, compatível com o padrão de render de `main.js`:

```json
"schedule": {
  "title": "HORÁRIOS DE TREINO",
  "classes": [
    {
      "group": "Infantis 5–9",
      "days": "Seg · Qua · Sex",
      "time": "18:00 – 19:00",
      "location": "Dojo Municipal",
      "instructor": "Sensei ...",
      "spots": "4 vagas"
    }
  ]
}
```

No frontend: filtros por faixa de idade (chips: `5–9` / `10–15` / `Adultos`) e um cartão por turma. Nunca uma tabela — ver ponto 8.

### 4. Placeholders visíveis em produção

- `content.json → about.image` é `""`. O `index.html` tem um fallback visível: `#about-img-placeholder`, com o texto **"Imagem do Lutador"**. É isso que os visitantes vêem na secção "Sobre".
- `content.json → classes.items[*].image` está `""` nos **cinco** cartões de modalidade.
- `content.json → site.phone` é `+351 275 000 000` — número de exemplo.
- `site.facebook`, `instagram`, `youtube`, `tiktok` estão todos `""` → `#footer-social` renderiza vazio.

**Correção:** conteúdo, não código. Uma sessão de fotos no dojo resolve os seis primeiros; o telefone e as redes resolvem-se em dois minutos no `admin/`.

---

## P1 — Acessibilidade e conformidade

### 5. Os `<label>` do formulário não estão ligados aos campos

Em `index.html`, todos os labels do formulário de contacto são irmãos dos inputs, sem `for`, e os inputs não têm `id`:

```html
<label id="label-name">Nome</label>
<input type="text" name="name" required placeholder="O teu nome">
```

Um leitor de ecrã anuncia "campo de texto" sem dizer qual. Falha WCAG 2.1 **1.3.1** e **3.3.2**. O mesmo em Email, Telefone, Modalidade e Mensagem.

**Correção:** `id` no input + `for` no label. Cinco campos, cinco linhas.

```html
<label for="f-name" id="label-name">Nome</label>
<input id="f-name" type="text" name="name" required placeholder="O teu nome">
```

### 6. O vermelho da marca não passa contraste sobre o preto

De `assets/css/style.css:5-16`:

```css
--bg:         #0d0d0d;
--accent:     #e31e24;
--text-muted: #888888;
```

- `--accent` sobre `--bg` dá **≈3,1:1**. Passa para texto grande (≥24px), **falha AA** para texto normal — e o accent é usado em `.section-label`, que é texto pequeno.
- `--text-muted` sobre `--bg` dá ≈5,4:1 — passa AA, mas está no limite quando aparece em `--bg-card` (#181818).

**Correção:** manter `#e31e24` para preenchimentos (botões, barras, o ★) e introduzir uma variante só para texto sobre fundo escuro, ex. `--accent-text: #ff6a5e` (≈6,4:1). Não é uma mudança de identidade: o vermelho dos botões fica igual.

### 7. O `placeholder` está a fazer o trabalho do label

`placeholder="O teu nome"`, `"teu@email.com"`, `"Como podemos ajudar?"`. Placeholders desaparecem ao escrever e são cinzento-claro em cinzento — falham revisão e contraste. Os labels já existem; os placeholders só precisam de deixar de ser a única pista.

---

## P1 — Telemóvel

### 8. Nada aqui foi desenhado a partir do telemóvel

Pontos concretos a verificar em 360px de largura:

- **Alvos de toque:** os botões `.btn` e os campos do formulário precisam de **44px** de altura mínima. Verificar `.btn` e `input`/`select`/`textarea` em `style.css`.
- **Zoom automático no iOS:** qualquer `input` com `font-size` abaixo de **16px** faz o Safari dar zoom ao focar, e o utilizador fica com o layout desalinhado. Forçar `font-size: 16px` nos campos.
- **`.form-row` de duas colunas** (Nome | E-mail) tem de colapsar para uma coluna abaixo de ~600px.
- **Horários (ponto 3):** quando a lista de turmas entrar, renderizar como cartões empilhados, não `<table>`. Uma tabela de dias × turmas não sobrevive a 360px.

### 9. O formulário de contacto está a fazer de inscrição — e não devia

Hoje o único caminho de conversão é `#contacto`: cinco campos genéricos e uma mensagem livre. Quem quer marcar uma aula experimental tem de escrever um texto e esperar.

**Correção:** um fluxo curto de marcação, em três passos, com três campos:

1. **Turma** — escolhe da lista de horários (herda a turma se vier de um cartão de horário)
2. **Contacto** — nome do praticante + telemóvel (email opcional)
3. **Confirmação** — o que escolheu, e a promessa: *"confirmamos por SMS em 24h"*

O resto dos dados (morada, data de nascimento, seguro) recolhe-se no dojo, na primeira aula. Pedir menos à frente aumenta o número de pessoas que chega ao dojo.

---

## P2 — Estrutura e conteúdo

### 10. O menu descreve páginas, não intenções

Sete itens irmãos, sem hierarquia, e nenhum para inscrição, quotas ou graduações. Reagrupar em quatro entradas — cada uma responde a uma pergunta que alguém traz de facto ao site:

| Entrada | Responde a | Conteúdo |
| --- | --- | --- |
| **Treinar** | "Quero começar — quando e quanto?" | Horários e turmas · Aula experimental · Onde treinamos · Quanto custa |
| **Modalidades** | "O que é que vocês ensinam?" | Karaté · Jiu-Jitsu · Kickboxing · Kids · Defesa Pessoal |
| **Associação** | "Quem são vocês?" | Quem somos · Corpo técnico · Galeria · Notícias · Contactos |
| **Área de sócio** | "As quotas estão em dia?" | Quotas · Presenças · Graduações · Documentos e seguro |

### 11. O herói vende artes marciais em geral, não a ASBKI

`hero.line1/2/3` são "DISCIPLINA. / FOCO. / FORÇA." e o subtexto é *"As artes marciais constroem um corpo mais forte…"*. Nada disto diz quem são, onde estão, quem pode treinar nem a partir de que idade. É copy de template — funciona para qualquer escola do mundo, e por isso não funciona para nenhuma.

**Correção:** trocar por informação. Exemplo do mesmo tamanho:

> **Artes marciais na Covilhã, dos 5 aos 70 anos.**
> Cinco modalidades, treinos todas as semanas. A primeira aula é gratuita e não precisa de equipamento.

E subir os horários da semana para logo abaixo do herói. Hoje, a primeira coisa depois do herói são quatro benefícios genéricos ("Ganhar Confiança", "Ficar em Forma") e a seguir estatísticas decorativas — incluindo **"100% Foco na Disciplina"**, que não é um número, é uma frase com um símbolo de percentagem. Esse espaço vale mais com horários e vagas.

### 12. Área de sócio — o ecrã que falta

Não existe nada no repo. Hoje quotas, presenças, graduações e seguros vivem em email, cadernos e no placard do ginásio, e todo esse trabalho recai na direção.

É o maior trabalho e o maior retorno. Mínimo viável, por sócio:

- Quotas em dívida + pagamento (MB Way resolve a cobrança sem uma única mensagem da direção)
- Presenças do mês
- Cinto atual, próximo exame, e o que falta para o cinto seguinte
- Estado do seguro desportivo

O progresso para o cinto seguinte é, dos quatro, o único que faz alguém abrir o site *entre* treinos.

---

## Ordem de execução

| Quando | O que | Porquê |
| --- | --- | --- |
| **Semana 1** | Pontos 1, 2, 4 — âncoras, botão morto, placeholders e telefone | Só edições de conteúdo. Tira o site de "parece abandonado". |
| **Semana 1–2** | Pontos 5, 6, 7 — labels, contraste do accent, placeholders | Conformidade. Poucas linhas de CSS/HTML. |
| **Semanas 2–4** | Pontos 3, 8, 9 — horários por turma, mobile, marcação em 3 passos | É aqui que se perde gente todos os dias. Maior retorno por euro. |
| **Mês 2** | Pontos 10, 11 — menu por intenção, herói reescrito | Precisa de decisão da direção sobre conteúdo. |
| **Trimestre** | Ponto 12 — área de sócio | Projeto próprio: autenticação, dados, pagamentos. |

---

## Nota sobre a versão anterior desta análise

Os mockups antes/depois feitos antes de eu ter acesso ao código assumiam que a ASBKI é uma associação exclusivamente de karate. **Está errado:** `content.json → classes.items` tem cinco modalidades (Karaté, Jiu-Jitsu, Kickboxing, Programa Kids, Defesa Pessoal) e o `<title>` diz "Escola de Artes Marciais". A crítica ao herói mantém-se, mas por outra razão: o problema não é prometer demasiadas modalidades — é não dizer onde, para quem e a partir de que idade.
