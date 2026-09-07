# Manual do CMS — ASBKI Covilhã

Guia rápido para quem gere o conteúdo do site no dia a dia. Não é preciso
saber programar.

## Entrar

1. Ir a `https://<o-teu-domínio>/admin`.
2. Introduzir a password de administração.
3. Se a password estiver errada por várias vezes seguidas, o sistema
   bloqueia novas tentativas durante alguns minutos — é normal, só esperar.

## Editar os horários das turmas

1. No menu lateral, abrir **Horários & Inscrição**.
2. Em **Turmas**, cada linha é uma turma (dias, hora, dojo, vagas). Editar
   os campos directamente.
3. Para acrescentar ou remover uma turma, usar os botões junto à lista.
4. No fim, clicar em **Guardar Alterações** (canto inferior direito).

O site regista os teus pedidos de aula experimental por turma — por isso,
se removeres uma turma que já tenha marcações à espera, elas continuam
guardadas em **Leads**, mas deixam de aparecer novas marcações para essa
turma.

## Publicar uma notícia com foto

1. No menu lateral, abrir **Notícias**.
2. Clicar em "Adicionar artigo" (ou equivalente na lista).
3. Preencher título, categoria, data, autor e o texto do artigo.
4. Para a foto: clicar no campo de imagem do artigo → escolher um
   ficheiro do computador (JPEG, PNG, WebP, GIF ou SVG, até 4 MB) → a
   imagem fica guardada na biblioteca e associada ao artigo.
5. Clicar em **Guardar Alterações**.

O artigo fica disponível de imediato em `/noticias/<o-título>`.

## Publicação e avisos de campos por preencher

Antes de guardar, o sistema verifica se ficou algum campo com texto por
preencher (morada, telefone, nomes ainda como "a confirmar" ou "a
definir"). Se encontrar, mostra a lista desses campos e não guarda —
para não publicar informação incompleta sem dares por isso. Depois de
corrigir (ou se quiseres mesmo publicar assim por agora), o sistema
permite continuar.

## Restaurar uma versão anterior

Todas as vezes que se guarda, fica uma versão nova no histórico — nunca
se perde uma versão anterior.

1. No menu lateral, abrir **Versões**.
2. A lista mostra a data e hora de cada gravação, mais recente primeiro.
3. Clicar em **Restaurar** na versão pretendida.
4. Confirmar. O conteúdo dessa versão volta a ficar activo no site — e
   fica registado como uma versão nova (a versão que estava activa antes
   de restaurar não desaparece, continua na lista).

São guardadas as últimas 30 versões.

## Ver e exportar marcações e contactos (Leads)

1. No menu lateral, abrir **Leads**.
2. A lista mostra os pedidos de aula experimental e as mensagens de
   contacto recebidos pelo site, mais recentes primeiro.
3. Para exportar tudo para um ficheiro (para abrir no Excel, por
   exemplo), clicar em **Exportar CSV**.

Os pedidos ficam guardados durante 12 meses; passado esse prazo são
apagados automaticamente.

## Biblioteca de imagens

Em **Imagens** vês todas as fotos já carregadas. Podes copiar o URL de
qualquer uma para usar noutro campo de imagem, sem teres de carregar o
ficheiro outra vez.

## Se algo correr mal

- **"Password incorreta"** — confirma que não há espaços a mais e que o
  Caps Lock está desligado.
- **"Demasiadas tentativas"** — espera uns minutos e tenta de novo.
- **O painel diz "desativado"** — a configuração técnica do servidor
  ainda não tem a password de administração definida; contacta quem trata
  da parte técnica do site.
- Nada disto apaga conteúdo por engano: usa **Versões** para voltar atrás
  sempre que precisares.
