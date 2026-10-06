# Avisos de terceiros — candidato privado rc.2

Este documento não licencia o Avalia Gestão. Cada dependência mantém seus próprios direitos/termos. A AGPL-3.0-only foi aplicada somente ao material próprio, conforme LICENSE/COPYRIGHT; não há licença comercial concedida por este índice. Textos de licenças de bibliotecas abaixo são avisos de terceiros, não a licença principal do produto.

## Inventário verificável

487 entradas npm de produção no lockfile desta etapa, incluindo plataformas opcionais; não são 487 componentes necessariamente executados. [Inventário](docs/THIRD-PARTY-LICENSES.md), [SBOM](docs/supply-chain/bom.cdx.json) e [revisão técnica](docs/DEPENDENCY-LICENSES.md).

Arquivos LICENSE/NOTICE disponíveis foram copiados **sem alteração**, com copyright e SHA-256 por componente. Os manifestos a seguir ligam pacote/versão, caminho original e texto preservado; arquivos ausentes não são inventados:

- [Windows x64](docs/supply-chain/third-party-notices-win32-x64.json): textos em docs/third-party/packages/win32-x64.
- [Linux ARM64](docs/supply-chain/third-party-notices-linux-arm64.json): textos em docs/third-party/packages/linux-arm64.
- [Font Inter: copyright e SIL OFL 1.1](docs/third-party/Inter-OFL.txt), The Inter Project Authors; origem [Inter](https://github.com/rsms/inter). Fonte de terceiros, sem atribuição ao produto; não alterada deliberadamente.
- caniuse-lite 1.0.30001812: dados de compatibilidade de [Can I Use](https://caniuse.com/), empacotados por [caniuse-lite](https://github.com/browserslist/caniuse-lite), sob [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/). Dados upstream não modificados pelo projeto; texto completo preservado nos diretórios de notices. Sem endosso do autor.
- Lucide 0.396.0: ISC, copyright Lucide Contributors e porções Feather de Cole Bemis identificadas no LICENSE preservado. Não apagar o aviso conjunto.
- jszip 3.10.2: upstream declara MIT OR GPL-3.0-or-later; candidato utiliza a alternativa MIT, conservando o texto upstream, sem remover opções concedidas pelo autor.
- pako: MIT AND Zlib; victory-vendor: MIT AND ISC. Conservar os avisos de todas as partes e subcomponentes, não substituir por uma licença única da aplicação.

## Fechamento dos avisos e escopo de distribuição

**PASS para o pacote atual de fontes e receitas**, condicionado à verificação do manifesto final: 517 textos originais Windows e 517 Linux, notices de subcomponentes incorporados pelo Next/victory-vendor, licença original do Firebase SDK e 21 blocos de copyright do SDK. Avisos para assets do navegador acompanham public/legal/Inter-OFL.txt e public/legal/THIRD-PARTY-NOTICES.txt; textos originais são concatenados sem modificar seu conteúdo. Contatos públicos de autores são preservados.

Declarações MIT de seis pacotes sem LICENSE separado estão preservadas com metadados originais, README quando disponível e referência SPDX MIT; nenhum titular/ano foi inventado. A declaração do próprio upstream é a evidência, não uma concessão nova pelo Avalia Gestão. Procedência e obrigações exatas: [revisão final](docs/FINAL-THIRD-PARTY-REVIEW.md).

## Nativos e obrigações para distribuição de binários

sharp 0.35.4 (Apache-2.0) utiliza libvips empacotado 1.3.3, biblioteca 8.18.6. O [inventário de versões Linux](docs/supply-chain/libvips-linux-arm64-versions.json) e os [avisos upstream fixados em v1.3.3](docs/third-party/sharp-libvips-1.3.3-NOTICES.md) identificam LGPL, MPL-2.0, BSD/MIT, fontconfig/FreeType/IJG e licença de patentes AOM. O SBOM npm sozinho não identifica todas essas bibliotecas.

Foram preservados [GPL v3](docs/third-party/GPL-3.0-only.txt) e [LGPL v3](docs/third-party/LGPL-3.0-only.txt) para acompanhamento das bibliotecas cobertas. O direito “or later” do upstream permanece; copiar o texto da versão 3 não o altera. [Origem e checksums dos textos suplementares](docs/supply-chain/supplementary-license-sources.json).

**BLOCKED para redistribuição externa de imagem/binário/cartão:** completar fontes correspondentes e condições de recombinação das bibliotecas LGPL/GPL, fontes MPL do Cairo e copyright/termos originais dos nativos identificados na revisão final. A imagem local inclui inventário Debian e seus avisos originais, Node/npm e bibliotecas npm, mas isso não substitui as fontes correspondentes exigidas para distribuição externa. Link a upstream não é sozinho prova de cumprimento de oferta de fonte. A receita fixada [sharp-libvips v1.3.3](https://github.com/lovell/sharp-libvips/tree/v1.3.3) acompanha o candidato; não declarar que ela inclui por si só todas as fontes necessárias.

O candidato de fonte não contém node_modules, SO ou binários nativos. Docker futuro, standalone e bundle/browser exigem verificar os notices efetivamente incluídos e também o código incorporado. Nenhum arquivo executável ou de cliente acompanha estes avisos. Os itens ausentes permanecem explícitos nos manifestos; uma licença comercial não elimina obrigações de terceiros.

## Concessão do projeto após decisão do proprietário

Código próprio passou a AGPL-3.0-only em 06/10/2026; o texto deste índice e os avisos upstream continuam com suas funções separadas. LICENSE/COPYRIGHT não relicenciam dependências/fontes/receitas. Gate fonte permanece PASS; binários/imagens/cartão permanecem BLOCKED pelas obrigações descritas acima. Nenhum contato/copyright upstream foi removido.
