# Procurações - Menezes Advocacia

Gerador estático de procurações, termos previdenciários, checklists de documentos e revogações. O preenchimento acontece integralmente no navegador, sem backend, CDN ou envio de dados.

## Rotas

| Rota | Situação | Uso |
|---|---|---|
| [`index.html`](index.html) | Produção atual | Gerador legado de procuração |
| [`revogacao.html`](revogacao.html) | Produção atual | Revogação legada |
| [`v2.html`](v2.html) | Beta | Formulário guiado, prévia A4 e Guia Previdenciário |
| [`revogacao-v2.html`](revogacao-v2.html) | Beta | Revogação com a interface e validações da v2 |

A v2 permanece paralela até aprovação explícita. A promoção não deve substituir `index.html` nem `revogacao.html` sem preservar rollback imediato para a versão legada.

## Procurações v2

O fluxo possui cinco etapas: benefício, pessoa que assina, dados, documentos e revisão. A seleção da representação gera automaticamente:

| Situação | Páginas |
|---|---:|
| Titular assina sozinho | 2 |
| Representação ou assistência | 3 |
| Administrador provisório | 4 |

O Termo de Compromisso é exclusivo do administrador provisório. Pai ou mãe, tutor, curador, guardião e procurador recebem somente Procuração, Termo de Benefício e, quando representam ou assistem o titular, Termo de Responsabilidade.

O Guia Previdenciário está em [`assets/benefits.js`](assets/benefits.js). Ele orienta triagem e coleta documental, mas não promete concessão nem substitui a análise do CNIS e do caso concreto.

## Validação e impressão

- Benefício, nome, CPF, telefone e endereço são obrigatórios no uso normal.
- CPF inválido, repetitivo, sequencial, placeholder ou repetido entre pessoas é bloqueado.
- Telefone com DDD inválido, quantidade incorreta, sequência ou repetição é bloqueado.
- RG recebe somente o número.
- Um clique em **Gerar PDF** exige o formulário válido.
- Segurar **Gerar PDF** por 1,2 segundo abre o modo interno para imprimir campos vazios; valores parcialmente preenchidos e inválidos continuam bloqueados.
- Cada documento é uma folha fixa de `210mm x 297mm`; o checklist é impresso separadamente e nunca integra o PDF jurídico.

Use escala `100%`, papel A4 e margens `Nenhuma` na caixa de impressão do navegador. Cabeçalhos e rodapés do navegador devem permanecer desativados.

## Privacidade

- Nenhum dado pessoal é salvo em `localStorage` ou `sessionStorage`.
- A beta pública não contém chave nem cliente OpenRouter.
- A interface não executa chamadas externas durante o preenchimento.
- Uma futura função de IA só pode aparecer mediante capacidade autenticada do JurisBridge; sem a ponte, ela não deve ser renderizada.
- Dados reais, PDFs de clientes e artefatos de teste permanecem fora do Git.

## Manutenção do catálogo

Cada benefício deve declarar `id`, `name`, `triageQuestions`, `minimumFormal`, `materialEvidence`, `conditionalDocuments`, `recommendations`, `alerts`, `sources`, `reviewedAt` e `validUntil`. Ao alterar uma regra:

1. Conferir a fonte oficial vigente.
2. Separar requisito formal, prova material e recomendação estratégica.
3. Registrar a data de revisão e eventual validade temporária.
4. Atualizar ou acrescentar teste em [`tests/catalog.test.mjs`](tests/catalog.test.mjs).
5. Executar a suíte visual e gerar novamente os PDFs de evidência.

O catálogo atual foi revisado em `15/07/2026`.

## Desenvolvimento

```powershell
python -m http.server 8765
```

Abra `http://127.0.0.1:8765/v2.html` ou `http://127.0.0.1:8765/revogacao-v2.html`.

Para os testes:

```powershell
npm ci
npm test
```

Defina `CHROME_PATH` se Chrome/Chromium não estiver em um dos caminhos usuais. A suíte cobre catálogo, matriz documental, CPF, telefone, duplicidade, toque longo, teclado, movimento reduzido, `1440x900`, `1280x720`, `768x1024`, `390x844`, PDFs reais e ausência de tráfego externo. Evidências são gravadas em `output/playwright/` e ficam ignoradas pelo Git.

## Fontes centrais

- [Representação legal - INSS](https://www.gov.br/inss/pt-br/saiba-mais/seus-direitos-e-deveres/procuracao/representacao-legal)
- [Portaria Conjunta MDS/INSS nº 34/2025 - BPC](https://www.gov.br/inss/pt-br/centrais-de-conteudo/legislacao/portarias-conjuntas/2025/ptcj34mds-inss.pdf/%40%40download/file)
- [Portaria Conjunta MPS/INSS nº 13/2026 - análise documental](https://in.gov.br/en/web/dou/-/portaria-conjunta-mps/inss-n-13-de-23-de-marco-de-2026-694778266)
- [Pensão por morte - INSS](https://www.gov.br/inss/pt-br/direitos-e-deveres/pensoes/pensao-por-morte)
- [Documentos do trabalhador rural - INSS](https://www.gov.br/inss/pt-br/saiba-mais/seus-direitos-e-deveres/atualizacao-de-tempo-de-contribuicao/documentos-originais-para-comprovacao-de-tempo-de-contribuicao/documentos-trabalhador-rural)

## Revogação

O fundamento preservado na revogação é o Código Civil, arts. 682, I, 686 e 687. O documento lembra que a revogação deve ser comunicada ao procurador e, quando necessário, aos órgãos ou processos em que o mandato tenha sido apresentado.
