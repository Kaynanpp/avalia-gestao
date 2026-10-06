# Release gates — decisões do proprietário, 06/10/2026

Continuação do fechamento técnico 47c1c62. Esta tabela substitui as pendências humanas anteriores. Nenhum push, release remoto, publicação Docker, backup real ou deploy nesta execução.

| Gate | Estado | Evidência / escopo |
| --- | --- | --- |
| 1. Recuperação Firebase | PASS preservado | Laboratório anterior; SCRYPT/UID/claims/Firestore/ADMIN/RH/senha/anonimato. Não repetido |
| 2. Pacote fonte | PASS | Source release Community AGPL-3.0-only, genérico, receitas/guias/notices; sem executáveis/dados/configuração real |
| 3. Revisão anterior de itens | PASS preservado | Sem novo levantamento geral |
| 4. Histórico público seguro | PASS | Novo snapshot local com um commit/sem remote; scan de secrets e revisão de contatos autorizados |
| 5. Marca/assets | PASS | Nome Avalia Gestão autorizado pelo proprietário; assets Atalaia EXCLUDED; genéricos/licenças terceiros preservados |
| 6. Código separado da marca | PASS | LICENSE/COPYRIGHT próprios, TRADEMARKS separados; sem novos direitos sobre upstream |
| 7. Software/procedimento backup | PASS preparado | Criptografia/verificação/custódia/janela/retention já documentadas; backup real AGUARDANDO MÍDIA |
| 8. Canal privado de segurança | PASS documental | suporteatalaiaprados@gmail.com autorizado; SECURITY/Issues configurados. Sem envio de e-mail ou alegação de teste operacional/SLA |
| 9. Instalação limpa | PASS | Instalação nova em ambientes de validação com lockfile atual; sem Firebase real |
| 10. Community self-hosted | PASS fontes | Community funcional, guia/receitas completos; serviços Pro/Cloud/Enterprise futuros |
| 11. RC2 técnica/licenciada | PASS | Suítes/builds/audits/SBOM/notices atuais; sem reduzir cobertura |
| 12. Deploy Raspberry | BLOCKED | Proprietário ainda não tem mídia em mãos. Sem backup real verificado; produção 20a6c87 intacta |

## Estados independentes

SOURCE RELEASE: PASS, pronto para operação separada de publicação de fontes. BINARY RELEASE: BLOCKED. DOCKER PUBLIC RELEASE: BLOCKED. RASPBERRY DEPLOY: BLOCKED.

A fonte não leva node_modules, standalone, binários, SO ou imagens pré-construídas. Binários/Docker/cartão continuam pendentes de fontes/condições LGPL/GPL/MPL e copyrights nativos exatos em FINAL-THIRD-PARTY-REVIEW.md. Não estão bloqueados pela marca Atalaia excluída ou pela licença própria aplicada.

## Decisões aplicadas

Autoria declarada Kaynan Fernandes; titular informado Kaynan, pessoa física; ferramenta ChatGPT Work. Copyright 2026 desta edição, sem anos anteriores inventados. AGPL-3.0-only escolhida pelo controle de versões futuras; opção comercial exige direitos/contrato separados. Cabeçalhos upstream intactos. CLA.md é modelo em revisão: bloquear merges externos antes do acordo definitivo/aceite. Isso não impede publicar o código próprio atual.

## Pendências futuras, sem bloquear fontes

Mídia/cofre/responsáveis e backup verificado antes de deploy; fontes/avisos nativos antes de binários; revisão/ativação do CLA antes de merges externos; contrato revisado antes de licença comercial formal. Não solicitar CPF/endereço/chaves no repositório público. A operação de push/publicação será separada e autorizada depois do relatório final.

Resultado vigente em OWNER-RELEASE-REPORT.md: SOURCE READY FOR PUBLICATION. Validações atuais e snapshot local verificados; pacote final sujeito à conferência de seu manifesto. Nada publicado.
