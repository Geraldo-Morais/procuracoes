# Procurações — Menezes & Advogados

Gerador estático (HTML + JS, sem backend) de procurações e revogações de procuração para o escritório.

## Arquivos

| Arquivo | Uso |
|---|---|
| [`index.html`](index.html) | **Outorga** de procuração ad judicia et extra |
| [`revogacao.html`](revogacao.html) | **Revogação** de procuração anterior |
| `logo.png` | Logotipo Menezes |

## Tipos suportados (ambos os arquivos)

- **Normal** — pessoa maior, capaz, que assina.
- **Absolutamente Incapaz** — menor de 16 anos; representante legal (pai, mãe, tutor) assina pela criança.
- **Relativamente Incapaz** — 16-17 anos ou maior com deficiência intelectual; assina com o assistente legal.
- **Analfabeto** — 1ª testemunha assina a rogo + impressão digital.

## Como usar

1. Abrir o HTML no navegador (duplo clique ou `python -m http.server` no diretório).
2. Escolher o **Tipo** na toolbar (canto superior esquerdo).
3. Preencher os campos amarelos (normalização automática de CPF, telefone, maiúsculas, UF via IBGE).
4. Clicar **Gerar PDF** — usa a impressão do navegador com layout A4 já formatado.
5. Validações: não gera se campos obrigatórios estiverem vazios ou CPFs inválidos. Modelo em branco (sem nenhum campo preenchido) é permitido para preenchimento manual.

## Fundamento jurídico da revogação

- **CC art. 682, I** — extinção do mandato pela revogação.
- **CC art. 686** — comunicação ao mandatário e a terceiros.
- **CC art. 687** — validade contra terceiros após notificação.
