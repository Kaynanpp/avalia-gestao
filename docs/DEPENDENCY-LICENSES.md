# Dependências e licenças — Etapa 5, 06/10/2026

Inventário técnico; não constitui parecer jurídico nem aprovação para distribuir o produto.

Lockfile SHA-256: `97018a1da895d23912b90420411b78c54fd0b6590c7108f0533bc5c483e7c415`. **487 entradas de produção**, incluindo opcionais de plataformas, zero expressões UNKNOWN após revisão de limiter/MIT. As 499 entradas anteriores pertencem ao lockfile anterior.

## Pacotes removidos

buffers 0.1.1 não tinha licença verificável. A cadeia antiga ExcelJS/unzipper incluía buffers, binary, chainsaw e traverse. A atualização testada para unzipper 0.12.5 removeu os quatro do lockfile. Não foi atribuída licença inventada. A inclusão efetiva nos chunks compilados anteriores não foi comprovada; a instalação antiga preservada no Raspberry não recebe retroativamente esta conclusão.

## Avisos coletados

| Plataforma | Instalados de produção | Arquivos copiados | Instalados sem aviso coletado |
| --- | ---: | ---: | ---: |
| Windows x64 | 454 | 517 | 68 |
| Linux ARM64 | 455 | 517 | 69 |

Textos copiados sem alteração, SHA-256 nos manifestos. Ausência de arquivo coletado não significa ausência de licença: alguns pacotes usam headers, README ou subpastas. Essas lacunas e opcionais precisam de inspeção antes da distribuição.

[Índice](../THIRD_PARTY_NOTICES.md), [Windows](supply-chain/third-party-notices-win32-x64.json), [Linux](supply-chain/third-party-notices-linux-arm64.json), [tabela completa](THIRD-PARTY-LICENSES.md).

## Condições específicas

- caniuse-lite: CC-BY-4.0; conservar autoria, termos e atribuição upstream.
- limiter 1.1.5: LICENSE.txt instalado contém MIT; evidência registrada.
- jszip: alternativa MIT OR GPL-3.0-or-later; opção MIT indicada no índice com texto original preservado.
- pako: MIT AND Zlib; victory-vendor: MIT AND ISC; cumprir ambos.
- Apache, BSD, ISC, BlueOak e outras permissivas: conservar copyrights e NOTICE quando houver.
- Inter: SIL OFL 1.1, copyright dos autores preservado. Lucide: conservar atribuições upstream.
- sharp 0.35.4 / sharp-libvips ARM64 1.3.3: libvips instalado 8.18.6. Avisos upstream incluem LGPL, MPL-2.0, licenças permissivas e condições de patentes. Textos oficiais coletados não comprovam entrega completa de fontes correspondentes, relinkagem, ofertas ou licenças de todos os binários.
- Debian/Node e bibliotecas da imagem não estão cobertos pelo SBOM npm.
- Firebase e Google Cloud têm termos de serviço próprios.

## Decisão

**PASS para o pacote atual de fontes/receitas**: notices originais e declarações upstream preservados; conferir manifesto final. **BLOCKED para redistribuição externa de imagem/standalone/cartão**: fontes LGPL/GPL, fontes MPL e copyright/termos nativos conforme FINAL-THIRD-PARTY-REVIEW.md. Não foi demonstrada incompatibilidade absoluta com AGPL + comercial nem certificada compatibilidade. Titularidade declarada e licença própria AGPL-3.0-only registradas em LICENSING-STRATEGY.md. Contratos comerciais/CLA definitivos futuros seguem revisão própria. A licença da aplicação não altera os termos destes componentes.

## Reprodução

Em instalação isolada: npm ci; scripts/license-inventory.cjs; scripts/supply-chain-inventory.cjs; scripts/third-party-notices.cjs com plataforma correspondente. O SBOM descreve o lockfile npm, não toda a imagem.

## Fechamento final

Coleta recursiva de 517 textos por plataforma, incluindo subcomponentes, licença original SDK Firebase e 21 blocos de copyright. Metadados/README originais de seis declarações MIT sem LICENSE separado preservados; referência SPDX MIT não inventa titulares. Assets do navegador recebem avisos em public/legal. A ausência de arquivo na raiz não se converte automaticamente em UNKNOWN; os manifestos mostram a evidência. Imagem privada homologada inclui inventário Debian/Node, mas sua distribuição externa continua distinta do pacote de fontes.

Licença do projeto aprovada pelo proprietário em 06/10/2026. A mudança de hash decorre exclusivamente da licença no metadata root do lockfile; grafo de dependências idêntico a 47c1c62.
