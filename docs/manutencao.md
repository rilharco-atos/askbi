# Plano de manutenção — ASBKI Covilhã

## Garantia

90 dias a partir do lançamento em produção: bugs reportados nesse período
(comportamento que já devia funcionar e não funciona) são corrigidos sem
custo adicional para o clube. Pedidos de funcionalidades novas não entram na
garantia — ver `docs/handover.md` para a divisão de responsabilidades.

## Rotina mensal

- Rever leads recebidos (inscrições e contactos) — confirmar que o e-mail
  está a chegar e que ninguém ficou sem resposta.
- Verificar que o CMS ainda grava conteúdo sem erros (testar uma alteração
  pequena e reverter).
- Rever `npm audit` (ou equivalente) às dependências do `package.json` —
  o projeto tem propositadamente poucas dependências (`express`, `multer`,
  `dotenv`, `@vercel/blob`), o que torna esta rotina rápida.
- Confirmar que o domínio e o SSL continuam válidos.

## Rotina trimestral

- Rever o `docs/qa/baseline.md`: correr `npm run audit` e `npm run e2e`
  contra produção (ou um ambiente equivalente) e atualizar os números.
- Rever o conteúdo desatualizado (eventos passados, horários alterados).
- Confirmar que as pré-visualizações das portas do dojo
  (`assets/dojo/preview-*.jpg`) ainda refletem o conteúdo atual — o workflow
  `previews.yml` deve tratar disto automaticamente quando `content.json`
  muda, mas vale a pena confirmar visualmente.
- Rever os registos SPF/DKIM/DMARC — problemas de entrega de e-mail
  aparecem frequentemente sem aviso.

## Rotina anual

- Renovar o domínio (ver `docs/handover.md` para o responsável).
- Rever as dependências principais (`express`, `multer`) por atualizações de
  segurança major.
- Rever os custos recorrentes (Vercel, Resend) contra o uso real — ajustar
  plano se necessário.
- Repetir o checklist de lançamento completo (`docs/checklist-lancamento.md`)
  como auditoria de saúde geral do site.

## Quando algo correr mal

1. Confirmar nos logs da Vercel se o erro é no build ou em runtime.
2. Se for um deploy recente a causar o problema, fazer rollback para o
   deployment anterior a partir do painel da Vercel (não precisa de acesso
   ao código para isto).
3. Se for um problema de conteúdo (algo que a direção do clube alterou no
   CMS), usar o restauro de versão do `/admin` para voltar a uma versão
   anterior do `content.json`.
4. Se nada resolver, contactar quem tiver acesso ao repositório — ver
   `docs/handover.md`.
