# Supply chain — rc.2

Lockfile v3 versionado com integridade npm; npm ci é obrigatório e falha se package.json divergir. As dependências diretas com faixa são resolvidas pelas versões do lockfile, não pela faixa durante ci. Não gerar lockfile novo inadvertidamente numa atualização de release.

CI tem apenas contents:read, usa emuladores fictícios e não precisa de secrets do cliente. Checkout, setup-node e setup-java foram fixados em SHA de commit resolvido pela API dos repositórios oficiais actions em 05/10/2026; comentários registram v4. Dependabot semanal prepara revisão de npm/actions, sem merge automático. A configuração só será executada remotamente após publicação autorizada.

Instalação da CI usa --ignore-scripts. Docker/local npm ci ainda podem executar scripts de pacotes do registry; isso deve ser realizado em executor isolado sem credenciais. Não há promessa de sandbox completo. Build next/font baixa Inter e npm usa rede. Docker base fixada no digest da imagem oficial Node 24 usada na validação Linux; atualizações exigem revisão desse pin. Reconstrução é pelo lockfile, não garantia bit-a-bit: download de fonte, ferramenta de build e metadados ainda podem variar.

[Inventário](DEPENDENCY-LICENSES.md) e SBOM CycloneDX 1.6 registram pacotes npm de produção, incluindo plataformas opcionais. Não cobrem automaticamente Debian, libvips/nativos ou serviços Firebase. A imagem distribuída exige inventário final dos binários e seus avisos. SHA-256 detecta alteração em cópias confiáveis; não substitui assinatura/proveniência autenticada.

Auditoria de produção e desenvolvimento deve ser registrada separadamente. Um resultado de zero vulnerabilidades npm não cobre serviços externos, configurações ou vulnerabilidades desconhecidas. Não ocultar achados dev como produção limpa.

## Resultado observado rc.2 — 05/10/2026

Produção: zero vulnerabilidades relatadas. Auditoria completa: 44 entradas afetadas (42 high, 2 moderate, zero critical), propagadas por **três advisories**, não 44 falhas distintas:

| Pacote de origem | Advisory | Classe | Escopo observado |
| --- | --- | --- | --- |
| braces <=3.0.3 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | high, exaustão por padrões aninhados | ferramentas Jest/Tailwind/ESLint e suas dependências |
| basic-ftp <=6.2.0 | [GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r) | high, DoS no parser de diretório | dependências da CLI Firebase |
| @opentelemetry/core <2.8.0 | [GHSA-8988-4f7v-96qf](https://github.com/advisories/GHSA-8988-4f7v-96qf) | moderate, alocação de memória | CLI Firebase/pubsub |

Nenhum desses achados apareceu no audit --omit=dev. O audit sugere mudanças principais e até downgrade da CLI; não executar npm audit fix --force como correção automática nem declarar compatibilidade com overrides de APIs de outra versão principal. Atualização das ferramentas/patch upstream precisa de homologação própria. Preservar o resultado bruto não zero; aplicar a classificação técnica mais recente abaixo sem suprimir o relatório nem reduzir testes.

Mitigação do ambiente atual: executor de build/teste isolado, sem secrets de clientes; CI sem credenciais e sem execução remota nesta etapa; não processar padrões/FTP externos não confiáveis nas ferramentas. Isso não elimina o advisory e não o converte em PASS. Publicação deve incluir decisão técnica registrada sobre ferramentas/atualizações, além dos demais gates.

O build final precisa ocorrer **depois** das suítes que usam next dev, pois elas recriam .next e removem standalone anterior. Para testar first access compilado, fazer build/cópia, executar esse teste primeiro, depois testes dev em emuladores novos e reconstruir o artefato final. Não montar diretório vazio criado automaticamente pelo Docker como se fosse build válido; conferir server.js antes do smoke.

## Resultado atual — Etapa 5, 06/10/2026

Produção: zero vulnerabilidades npm. Auditoria completa: **11 entradas afetadas, 9 high/2 moderate/0 critical, dois advisories únicos** (braces e @opentelemetry/core). No fechamento, os dois advisories têm ACCEPTED DEV RISK conforme SECURITY-DEPENDENCY-REVIEW.md: atualização compatível indisponível e nenhum caminho do usuário final identificado. O resultado bruto exit 1 é preservado.

basic-ftp 6.2.2 corrige o ramo get-uri. source-map-js 1.2.2 e postcss-selector-parser 7.1.6 corrigem dois avisos adicionais observados nesta data. Jest não utilizado removido, suítes node:test preservadas. unzipper 0.12.5 remove buffers sem licença confirmada. Compatibilidade XLSX, streaming, ZIP, FTP e CSS testada com dados sintéticos.

Windows e Linux ARM64 receberam instalações isoladas novas. ExcelJS externo no servidor respeita carregamento opcional AWS; nenhuma integração AWS adicionada. Avisos das duas plataformas coletados, mas conformidade de binários/imagem permanece BLOCKED. Gate 1 cloud conserva evidência anterior; recuperação em emuladores repetida nesta etapa.

Auditoria Linux ARM64 desta execução: zero produção; completa 10 entradas (8 high/2 moderate), mesmos dois advisories. Windows: 11 (9 high/2 moderate); tailwindcss-animate consta como afetado indireto somente na resposta Windows. A diferença de propagação do audit não elimina os avisos raiz.

## Fechamento final

80 unitários preservam os 74 anteriores; cinco novos cobrem notices/SDK/distribuição. Produção npm zero; completa Windows 11 (9 high/2 moderate), Linux 10 (8 high/2 moderate), mesmos dois advisories com ACCEPTED DEV RISK. Standalone efetivo: 198 módulos; pacotes npm braces/core/CLI ausentes, mas implementação braces incorporada ao NFT presente e não carregada no ensaio HTTP instrumentado. Scanner da imagem e mitigação dos CVEs Debian documentados separadamente em DOCKER-RELEASE-VALIDATION.md. 517 notices originais por plataforma. Fonte/receitas PASS; redistribuição da imagem/binário BLOCKED para fontes/termos nativos conforme revisão final, sem atribuir licença principal.

## Decisões do proprietário — metadata de licença

Projeto próprio agora AGPL-3.0-only; bibliotecas mantêm seus termos. O grafo inteiro de dependências é idêntico ao de 47c1c62; apenas packages[""] recebe licença e muda SHA do lockfile para 97018a1da895d23912b90420411b78c54fd0b6590c7108f0533bc5c483e7c415. SBOM/root grant e evidências de notices refletem esse hash; nenhuma atualização de dependência ou auditoria geral foi feita. LICENSE/COPYRIGHT/CLA não substituem avisos de terceiros. Gates de binários/imagens permanecem independentes.
