# Distribuição de terceiros — fechamento focado

## Escopo do candidato atual

O artefato público candidato vigente é **Community em fontes e receitas de construção**: exclui node_modules, .next/standalone, imagens Docker, sistema operacional e dados/configurações do cliente. Essa é a estrutura do gerador de release existente, não uma nova edição. A imagem ARM64 é homologada privadamente; nenhum registry recebe a imagem.

**Gate do pacote de fontes: PASS**, condicionado à verificação final do manifesto. Textos upstream e suas origens/hashes acompanham o pacote. Direitos sobre código próprio/nome/licença definitiva são decisões separadas do proprietário.

**Redistribuição externa de imagem/standalone/cartão pronto: BLOCKED**, fora do artefato público fonte desta execução. Não interpretar PASS das fontes como licença para distribuir binários sem cumprir as condições abaixo.

## Avisos e fontes tipográficas

- 517 avisos npm coletados por plataforma Windows/Linux ARM64, incluindo subcomponentes empacotados dentro de Next e victory-vendor; não apenas LICENSE na raiz. O coletor recusa symlinks e não duplica outros node_modules.
- Inter: copyright e SIL OFL preservados sem alterações. O texto acompanha o servidor e o navegador em /legal/Inter-OFL.txt. Fontes fallback do dispositivo não são copiadas.
- SDK Firebase: texto oficial do commit da versão 12.19.0 e 21 blocos originais de copyright/license extraídos da instalação. Não atribuir o SDK ao produto.
- Licenças suplementares: arquivos oficiais no gitHead npm ou tag exata resolvida para commit, ou README instalado com termos completos. Integridade npm comparada ao lockfile, URLs e SHA-256 registrados.
- client-only 0.0.1, eastasianwidth 0.2.0, react-remove-scroll-bar 2.3.8, stream-events 1.0.5, stubs 3.0.0 e tr46 0.0.3: declaração MIT original do pacote/registry confirmada por integridade e metadados instalados. Texto MIT padrão SPDX fornecido como referência inalterada, com declaração/README públicos originais. Nenhum copyright, titular ou ano ausente foi inventado. Isso não cria uma licença nova para esses pacotes ou para o produto.
- Texto agregado em /legal/THIRD-PARTY-NOTICES.txt acompanha os bytes de fontes/JS entregues ao navegador; os blocos upstream preservam seus bytes, separados apenas por rótulos de origem. Referências ausentes ou hash divergente fazem o gerador falhar.
- caniuse-lite CC-BY-4.0, Lucide/Feather ISC, jszip alternativa MIT, type-fest alternativa declarada e pako/victory-vendor com termos cumulativos permanecem identificados. Contatos públicos em copyright são atribuição upstream, não dados do cliente.

## Nativos: condições exatas antes de entregar binários a terceiros

@img/sharp-libvips-linux-arm64 **1.3.3**, biblioteca **libvips 8.18.6**:

| Componente | Versão | Obrigação ainda não comprovada para redistribuição binária |
| --- | --- | --- |
| libvips | 8.18.6 | Fonte correspondente, avisos originais e substituição/religação conforme LGPL |
| glib | 2.89.4 | Fonte correspondente incluindo patch glib-without-gregex da receita |
| libexif | 0.6.26 | Fonte LGPL e copyright original |
| libheif | 1.23.2 | Fonte LGPL e copyright original |
| fribidi | 1.0.16 | Fonte LGPL e copyright original |
| pango | 1.58.2 | Fonte LGPL e copyright original |
| librsvg | 2.62.91 | Fonte LGPL completa, dependências/lock/build necessários |
| proxy-libintl | 0.5 | Fonte LGPL e copyright original |
| cairo | 1.18.4 | Fonte coberta MPL-2.0 e aviso de acesso à fonte |
| aom | 3.15.0 | Copyright/BSD-2-Clause e AOM Patent License completos |
| freetype | 2.14.3 | Copyright e FTL completo da versão |
| fontconfig | 2.18.3 | COPYRIGHT/COPYING original completo |
| libpng | 1.6.58 | Copyright/licença PNG completos |
| mozjpeg | 0826579 + patch da receita | Avisos zlib/IJG/BSD completos e identificação do patch |
| libtiff | 4.7.2 | Copyright/licença original completos |

Demais permissivas da biblioteca devem conservar avisos dos arquivos/fontes efetivamente usados; todas as 28 versões estão em libvips-linux-arm64-versions.json. Receitas originais build.sh, posix.sh e versions.properties v1.3.3 foram preservadas com hashes; versões conferem com o binário. **Receita e links não são um bundle completo de fontes nem uma oferta de fonte mantida pelo distribuidor.** Não foi inventada obrigação contratual de fornecer fontes por vários anos.

A ligação compartilhada libvips.so permite uma estratégia de substituição em imagem reconstruída; antes de entregar a imagem, demonstrar substituição/recombinação aplicável e disponibilizar as fontes correspondentes por uma forma aceita pelas licenças. Não proibir engenharia reversa para depurar modificações da biblioteca nos futuros contratos.

## Base Docker

Node oficial fixado por digest; runner leva inventário dpkg com pacote binário, versão, pacote-fonte/versão e arquitetura. /usr/share/doc e /usr/share/common-licenses são preservados, com symlinks resolvidos para permitir cópia fiel ao Windows. LICENSE Node e npm disponíveis são conservados; npm/Yarn executáveis são removidos do runner por não serem usados.

Antes de redistribuir a imagem externamente, prover fontes/oferta/acesso equivalente dos componentes copyleft efetivamente entregues, nas versões do inventário base-image/packages.tsv, incluindo libc6, bash, coreutils, dpkg, perl-base e bibliotecas GPL/LGPL aplicáveis. Copyrights/termos Debian já acompanham a imagem; isso sozinho não comprova a entrega das fontes. Imagem local privada não foi publicada e não integra o pacote fonte candidato.

## Referências

Inventários/hashes: docs/supply-chain/third-party-notices-*.json, supplementary-npm-notices.json, final-license-sources.json, firebase-copyright-evidence.json e standalone-distribution.json. As cópias são avisos de terceiros, nunca LICENSE da aplicação.

MPL: https://www.mozilla.org/en-US/MPL/2.0/FAQ/ — distribuição de bibliotecas/executáveis exige informar como obter a fonte coberta. LGPL/GPL: textos originais preservados em docs/third-party; aplicar as cláusulas ao formato de distribuição realmente escolhido, sem pressupor que obriguem tornar toda a aplicação proprietária pública.

## Decisão de formato inicial — proprietário

Distribuição inicial explicitamente escolhida: **fontes + receitas de build + documentação self-hosted**. Pacote fonte aplica AGPL-3.0-only somente ao material próprio e acompanha os mesmos avisos/copyrights upstream. A escolha não elimina obrigações desses avisos nem aprova distribuir imagem/binário/cartão. Gate de binários continua BLOCKED pelos componentes/obrigações exatos listados nesta revisão.
