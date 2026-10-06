# Inventário de marca e assets

Inventário técnico, não conclusão jurídica. Licença do código não concede automaticamente direitos do nome/logotipo. A aprovação pública final continua com o titular.

| Asset | Origem/autoria conhecida | Licença/titularidade | Estado para distribuição |
| --- | --- | --- | --- |
| public/brand/atalaia-logo.jpg | Logo fornecido pelo usuário, da empresa; autor original não informado | Autorização de instalação, não de redistribuição pública | EXCLUDED do pacote e snapshot genéricos |
| public/brand/atalaia-mark.png | Referência fornecida pelo usuário | Direitos da empresa/autor não concedidos para distribuição | EXCLUDED |
| public/brand/atalaia-wordmark.png | Referência fornecida pelo usuário | Direitos da empresa/autor não concedidos para distribuição | EXCLUDED |
| public/brand/avalia-gestao.svg | Código vetorial local da etapa 3, gráfico geométrico, não copiado da marca empresarial | Origem versionada do próprio projeto | PASS técnico para candidato genérico; titularidade do produto separada |
| Nome Avalia Gestão | Nome adotado pelo projeto | Registro, disponibilidade e titularidade não verificados | BLOCKED para liberação do nome; nenhum registro presumido |
| Imagem Open Graph | Código próprio com texto/formas | Origem versionada do projeto; avisos de fonte necessários | PASS técnico; nome/titularidade separados |
| docs/screenshots/product-*.jpg | Capturas locais de dados fictícios | Origem no próprio produto, sem dados de clientes | PASS técnico; titularidade final do produto pendente |
| Ícones Lucide 0.396.0 | Pacote upstream no lockfile | LICENSE ISC, porções Feather/Cole Bemis e Lucide Contributors explicitadas | PASS com aviso original preservado em THIRD_PARTY_NOTICES |
| Inter | Google Fonts/next/font, projeto Inter | SIL OFL 1.1/copyright preservados em third-party/Inter-OFL.txt | PASS para fonte/avisos do candidato; conferência dos WOFF da distribuição compilada pendente |
| Fontes fallback do sistema | Instaladas no dispositivo | Não redistribuídas | EXCLUDED do pacote |
| Ilustrações/fotos adicionais | Nenhuma encontrada | Nenhuma origem inventada | EXCLUDED; não introduzir sem origem/licença |

## Separação entre código e marca

A aplicação privada mantém a marca atual. O pacote de reconstrução genérica exclui os três arquivos Atalaia e transforma os defaults de produto/Docker/Compose para generic. A referência de código ao modo empresarial permanece como possibilidade de customização, sem incluir nem conceder o asset. Operador que reintroduza essa marca deve obter autorização própria.

Não existe LICENSE definitivo nem licença da marca aplicada. No futuro, definir em documento separado uso nominativo, logos, redistribuição/customização e proibição de sugerir endosso indevido, conforme decisão do titular. Código AGPL/comercial e marca são concessões independentes. Não declarar registro ou exclusividade sem evidência.

Assets substituíveis não bloqueiam testes/install da edição genérica. Direitos sobre o código/nome e avisos das fontes ainda precisam do aceite de distribuição pública. Revisar todos os arquivos e binários do pacote final, não só esta lista.

Revisão 06/10/2026: classificação PASS é técnica de origem/inclusão no candidato privado, não licença definitiva ou parecer sobre marca. Gate 5 permanece BLOCKED para publicação pelo nome/titularidade; os três assets Atalaia ficam fora da distribuição. Ver [checklist de titularidade](OWNERSHIP-CHECKLIST.md). Nenhuma foto ou imagem nova foi introduzida nesta etapa.

Fechamento: Atalaia EXCLUDED não bloqueia os assets genéricos Community. Gate 5 técnico dos assets genéricos PASS; a autorização do próprio nome Avalia Gestão permanece BLOCKED humano/jurídico. Direitos do código tratados separadamente em LICENSING-APPLICATION-CHECKLIST.md. Nenhum registro de marca foi presumido.

## Decisão posterior do proprietário — 06/10/2026

Nome Avalia Gestão autorizado pelo proprietário para uso/comercialização: Gate 5 PASS para pacote genérico fonte, conforme declaração, sem parecer jurídico/registro de marca. Assets Atalaia permanecem EXCLUDED. Ver TRADEMARKS.md. Esta decisão substitui apenas a antiga pendência do nome, preservando o inventário/exclusões anteriores.
