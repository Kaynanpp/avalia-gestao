Registro histórico anterior às decisões do proprietário de 06/10/2026. Resultado vigente: [preparação para publicação](OWNER-RELEASE-REPORT.md). Este relatório preserva a evidência técnica de 47c1c62 e não representa o estado atual de licença/marca/canal.

# Fechamento final — Avalia Gestão rc.2, 06/10/2026

## Estado técnico

**TECHNICALLY READY**, para o software e o pacote Community atual de fontes/receitas. Homologação privada da imagem ARM64 PASS; não equivale à liberação da imagem para terceiros nem à configuração real de produção.

## Alertas restantes

| Alerta | Runtime? | Explorável no produto? | Correção | Classificação |
| --- | --- | --- | --- | --- |
| braces / CVE-2026-93687, high | npm dev; implementação incorporada ao NFT está presente na imagem | Nenhum caminho final identificado; NFT não carregado no ensaio. Glob hostil em build continua vetor | Sem patch publicado 3.0.3; executor isolado, entradas de build revisadas, sem secrets | ACCEPTED DEV RISK |
| core / CVE-2026-54285, moderate | Dev CLI Firebase/PubSub; core ausente do standalone | Baggage hostil alcança ferramentas, não endpoints do produto | Corrigido em 2.8; cadeia CLI ainda core 1.x. Não impor major incompatível | ACCEPTED DEV RISK |
| Debian base / Trivy | Ferramentas/bibliotecas presentes; 49 registros, 11 CVEs únicas | Três NOT_AFFECTED, demais vetores CLI/privilegiados sem caminho HTTP identificado | Patches Bookworm disponíveis aplicados; não root/capabilities/SUID, no-new-privileges/read-only | Riscos locais mitigados, revisão em 30 dias/próximo release |

Não suprimidos os relatórios. Audit npm não cobre SO: produção zero; completo exit 1 preservado. Matriz/versões/cadeias/mitigações em SECURITY-DEPENDENCY-REVIEW.md e DOCKER-RELEASE-VALIDATION.md. Correções anteriores basic-ftp, source-map-js e selector-parser RESOLVED.

## Distribuição de terceiros

**PASS para o pacote fonte/receitas**: 517 notices originais por plataforma, licença original Firebase, 21 copyrights SDK, avisos Inter e agregados para navegador, hashes e metadados upstream. Arquivos preservados byte a byte, inclusive codificações não UTF-8. Contatos públicos de autores não foram removidos.

**BLOCKED para distribuição externa de imagem/standalone/cartão**: fontes/recombinação LGPL de libvips 8.18.6, glib 2.89.4, libexif 0.6.26, libheif 1.23.2, fribidi 1.0.16, pango 1.58.2, librsvg 2.62.91 e proxy-libintl 0.5; fonte MPL Cairo 1.18.4; copyrights/termos completos AOM, FreeType, fontconfig, libpng, mozjpeg e TIFF; fontes correspondentes dos componentes Debian GPL/LGPL nas versões inventariadas. Obrigações exatas em FINAL-THIRD-PARTY-REVIEW.md. Nenhuma nova licença ou oferta de fonte foi inventada.

## Docker

ARM64, Node 24.21.0/Next 15.5.27. Imagem privada **cea9002b621eef713c970fa1784a8c27edd560bc730a96ec3d864f674a0dd002**, **509.614.761 bytes (486,0 MiB)**, sem crescimento anormal observado. Build, startup e health healthy na porta configurada PASS. Usuário node, CapEff=0, NoNewPrivs=1, read-only e configuração privada externa. Avisos Debian/Node/npm preservados; npm/yarn executáveis removidos do runtime.

Fluxo sintético PASS: ADMIN, RH, troca de senha, 403 para RH administrar usuários, períodos permitidos, páginas e notices 200, UID/dados externos e login após reinício. Instrumentação NFT/braces/core false. Trivy 0.75.0: 49 registros Debian/11 CVEs, zero Node.js; scan de secrets em todas severidades zero. Os dois patches disponíveis foram aplicados. NOT_AFFECTED fundamentado no tracker Debian e inspeção do runner, não exclusão numérica.

Build usa parâmetros públicos fictícios/emulador; credenciais privadas externas. NEXT_PUBLIC de cliente é fixado no build. /api/ready=503 em emuladores é proteção esperada. Instalação real exige rebuild com configuração pública autorizada/emulador false e configuração privada externa; não é uma imagem ligada a Firebase real aprovada. Nenhum registry.

## Marca

Atalaia **EXCLUDED** do pacote; assets genéricos, Inter/Lucide e separação do código PASS. Direito sobre o nome **Avalia Gestão: BLOCKED humano**, sem conclusão jurídica automática.

## Licenciamento

AGPLv3 + alternativa comercial continua preparação. Confirmar titular legal/anos, direitos sobre contribuições e relicenciamento, AGPL-only ou later, Community/comercial futuro e política de contribuições/CLA. Arquivos/alterações futuros exatos em LICENSING-APPLICATION-CHECKLIST.md. Nenhuma LICENSE principal aplicada.

## Segurança e suporte

Gate 8 **BLOCKED operacional**: fornecer UM e-mail dedicado de reporte privado com recebimento testado OU repositório autorizado com Private Vulnerability Reporting ativo/testado; designar responsável/substituto. Não enviar senhas ou chaves. Issues Community e Pro/Enterprise futuros são separados; suporte pago não bloqueia este gate.

## Backup

Software pronto: **PASS no escopo demonstrado**; backup real: **BLOCKED operacional, não executado**. Fornecer mídia NTFS exclusiva e caminho, espaço livre calculado >= 2×(23S+I+C), piso inicial 32 GiB sem garantia de suficiência, cofre separado para chave AES-256-GCM de 32 bytes, ACL operador/SYSTEM, responsável/substituto, janela e retenção proposta 7/4/12. Detalhes em BACKUP-POLICY.md. Não há destino/cofre efetivamente disponibilizados nem leitura de dados reais para estimativa.

## Deploy

**Adiado.** Raspberry ativo permanece **20a6c87**, container healthy e mesmo identificador de imagem observado antes/depois. Nenhuma troca, licença definitiva, publicação, acesso a dados Firebase reais ou alteração de infraestrutura de produção.

## Validação

- Unitários **80/80 Windows e 80/80 Linux ARM64**, zero skips/falhas: 74 preservados + seis testes de notices/empacotamento.
- Integração HTTP **13/13 PASS**, incluindo unicidade, concorrência, anonimato/elegibilidade e colegas.
- Lint/TypeScript **PASS nas duas plataformas**; build Windows e Docker Linux ARM64 **PASS**.
- Recuperação não afetada: **1 teste em emuladores e Gate 1 real PASS anteriores preservados**, sem repetir desnecessariamente. RTO real anterior 31 min 7,964 s, não SLA/cold infrastructure.
- npm audit produção **0 nas duas plataformas**; completo Windows **11 (9 high/2 moderate)**, Linux **10 (8 high/2 moderate)**, mesmos dois advisories aceitos, sem critical.
- SBOM CycloneDX 1.6 **schema oficial PASS**, 487 entradas de produção, lock SHA-256 080320154019bdeaacbdac23da8b474d1f3fcf5c0c3f4c18f9c0babe410836e6 inalterado.
- Docker funcional/instrumentado e notices da imagem versus fonte **PASS**; Trivy secrets **0**.
- Pacote genérico de **1.337 arquivos**, manifesto e arquivo extraído **PASS**; **1.034 hashes de notices conferidos**. Snapshot local com **1 commit/sem remote**, zero indicadores de secrets. **112 alertas de contato upstream** revisados por proveniência/hash, zero dados privados identificados. Scan do histórico privado: zero indicadores. Identificador de fonte em release-manifest.json e checksum do arquivo em registro privado separado, evitando autorreferência. Nenhum histórico original é publicado.

## Bloqueios técnicos

Nenhum defeito técnico impeditivo demonstrado do aplicativo/pacote fonte. Distribuição de binários exige cumprir as obrigações de terceiros acima; isso não é defeito de funcionamento nem é resolvido pela aprovação da licença própria. Canal/custódia indisponíveis são pendências operacionais; titularidade/licença são humanas.

## Decisões do proprietário

Confirmar titular/anos/direitos de contribuições/dual licensing; escolher AGPL-only ou later e política de contribuições/CLA; confirmar direitos sobre Avalia Gestão; designar canal privado/responsáveis; aprovar custódia, janela e retenção. Autorização de publicação/deploy é uma decisão futura separada.

## Estado de publicação

**DO NOT PUBLISH.** Software tecnicamente pronto; direitos/licença/canal privado ainda pendentes. Fontes candidatas PASS não autorizam distribuir a imagem pronta, cuja conformidade de binários permanece BLOCKED. Nenhum dado do cliente integra o pacote.

## Próximas ações

1. Confirmar titularidade/nome, estratégia AGPL + comercial e política de contribuições.
2. Disponibilizar e testar UM canal privado de vulnerabilidades.
3. Antes de distribuir binários, completar fontes/avisos nativos exatos listados na revisão.
4. Disponibilizar mídia/cofre/responsáveis e janela para backup real antes de qualquer deploy.
5. Após os requisitos aplicáveis, revalidar o candidato e solicitar autorização específica de publicação ou deploy.
