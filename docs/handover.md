# Handover — ASBKI Covilhã

Documento de transição para quem ficar responsável pela manutenção do site
depois do lançamento. Cobre acessos a pedir, custos recorrentes e quem faz o
quê. Ver também `docs/checklist-lancamento.md` (o que verificar antes de ir ao
ar) e `docs/manutencao.md` (rotina depois de ir ao ar).

## Acessos a pedir ao clube / à Atos antes do lançamento

- **Domínio**: acesso de DNS (registo do domínio do clube), para apontar para
  a Vercel e configurar SPF/DKIM/DMARC do e-mail.
- **Vercel**: convite para o projeto (equipa ou conta), com permissão para
  ver logs de deploy e variáveis de ambiente.
- **GitHub**: acesso de escrita ao repositório `rilharco-atos/askbi` (ou o que
  vier a ser o repositório definitivo) para quem for dar manutenção.
- **Resend** (ou o serviço de e-mail escolhido): conta com a `RESEND_API_KEY`
  e o domínio de envio verificado.
- **Google Search Console**: propriedade do domínio, para submeter o
  `sitemap.xml` e monitorizar indexação.
- **Plausible Analytics** (se usado): acesso ao painel do domínio.
- **CMS (`/admin`)**: a password do CMS (`ADMIN_PASSWORD` ou
  `ADMIN_PASSWORD_HASH`) deve ficar só com quem o clube designar para editar
  conteúdo — não é a mesma coisa que acesso ao GitHub/Vercel.

## Custos recorrentes e renovações

| Item | Frequência | Responsável por renovar |
|---|---|---|
| Domínio | anual | clube (ou quem gerir o domínio) |
| Vercel (plano, se pago) | mensal/anual | quem detiver a conta Vercel |
| Vercel Blob (armazenamento de conteúdo e imagens) | consumo | mesma conta Vercel |
| Resend (envio de e-mail de leads) | consumo/mensal, conforme plano | quem detiver a conta Resend |
| Certificado SSL | automático via Vercel — sem ação recorrente, mas confirmar no checklist de lançamento |

## Quem faz o quê (divisão de responsabilidade)

- **Conteúdo do dia a dia** (notícias, eventos, horários, fotos): o clube,
  via `/admin` — não precisa de acesso a código.
- **Alterações de código, novas páginas, integrações**: quem tiver acesso ao
  repositório e a esta documentação técnica.
- **Leads (inscrição/contacto)**: o clube recebe por e-mail (`LEADS_TO_EMAIL`)
  — confirmar com o clube quem responde e em quanto tempo.
- **Incidentes de produção** (site em baixo, erro 500): quem tiver acesso à
  Vercel para ver logs e fazer rollback de deploy.
- **Garantia de 90 dias** (ver `docs/manutencao.md`): correções de bugs
  reportados nesse período ficam a cargo de quem entregou o projeto,
  sem custo adicional para o clube.

## O que este ramo (`wt/qa`) entrega e o que falta

Este ramo cobre evidência de QA, CI e documentação (ver relatório de entrega
para o histórico completo). Não cobre: implementação de leads, metadados de
SEO, cabeçalhos de segurança, robots/sitemap, páginas legais — ver
`docs/qa/baseline.md` para a lista exata do que ainda não existe e o que
falta para desbloquear.
