# Docker ARM64 — fechamento privado, 06/10/2026

Homologação local, sem registry/deploy. O pacote Community atual é de fontes; esta validação não autoriza redistribuição da imagem compilada (ver FINAL-THIRD-PARTY-REVIEW.md).

## Ensaio

Node 24.21.0 bookworm slim fixado por digest, Next 15.5.27; build ARM64 nativo no Raspberry. Usuário node, root filesystem somente leitura, tmpfs restritos, cap_drop ALL, no-new-privileges, sem setuid/setgid no runner. Configuração e segredo HMAC fictício externos à imagem. Porta 3020 somente loopback com túnel SSH; produção não recebeu mudança. Healthcheck acompanha PORT; porta default permanece 3000.

Ensaio sintético PASS: inicialização, healthcheck healthy, home/login/avaliações/páginas institucionais e avisos públicos HTTP 200; login ADMIN, criação RH, troca de senha, recusa de administração de usuários para RH (403) e consulta permitida de períodos (200). Reinício preservou documento externo e UID e permitiu novo login. /api/ready retorna 503 deliberadamente porque a imagem de produção está ligada a emuladores; não desabilitamos a proteção de produção.

Instrumentação de Module._load: nextNftLoaded=false, npmBracesLoaded=false, otelCoreLoaded=false em inicialização e operações ADMIN/RH. Inventário estático encontrou braces incorporado ao NFT, portanto o teste demonstra não carregamento nesse fluxo, não ausência de bytes nem prova universal de inexplorabilidade. Nenhuma rota do produto recebe glob/NFT ou baggage para a CLI.

Imagem validada antes da atualização final de avisos: e6661238b8c13fc5a3f5b1140b72c1f0eafc357cc167a295e9dd34c3567dde88, 509.485.167 bytes. O identificador e resultado do candidato final após os avisos constam no relatório final de fechamento.

Imagem final homologada: **cea9002b621eef713c970fa1784a8c27edd560bc730a96ec3d864f674a0dd002**, **509.614.761 bytes (486,0 MiB)**. Repetição completa sintética PASS, health healthy na porta configurada e flags instrumentadas false. /app/docs/third-party ocupa 12 MiB e /app/node_modules 87 MiB; não foi observado crescimento anormal, diferença de 129.594 bytes frente à imagem imediatamente anterior explicada pelos avisos finais. Scan Trivy de secrets em todas as severidades: zero achados.

A imagem de homologação foi construída com parâmetros públicos fictícios e modo emulador para executar o fluxo sem acessar Firebase real. Credenciais privadas e HMAC são configuração externa; parâmetros NEXT_PUBLIC de cliente são fixados no build pelo Next. Uma imagem para instalação real exige rebuild com a configuração pública correta e emulador desativado, além de configuração privada externa. Este ensaio não publica nem substitui a imagem de produção; o bloqueio /api/ready em emuladores confirma a proteção, não é um healthcheck de Firebase real aprovado.

## Scanner gratuito

Trivy 0.75.0 ARM64 oficial, checksum do release conferido. Scan HIGH/CRITICAL, sem supressão, relatórios brutos privados. Primeira imagem: 65 entradas (inclui repetição da mesma CVE em pacotes). Após correções: **49 entradas Debian, 11 CVEs distintas, zero entradas Node.js**. Não afirmar zero CVEs da imagem a partir do audit npm.

- RESOLVED: libpcre2 10.42-1+deb12u2 e perl-base 5.36.0-7+deb12u4, disponíveis na mesma base suportada. Removidos npm/yarn não usados no runner, eliminando seus achados de brace-expansion, ip-address, tar, undici e http-cache-semantics. Não alterados os módulos da aplicação.
- NOT_AFFECTED: [CVE-2023-45853](https://security-tracker.debian.org/tracker/CVE-2023-45853), scanner critical, pertence a contrib/minizip não compilado no zlib Debian Bookworm; não há zipOpenNewFileInZip4_6 nesse componente. O finding bruto é preservado.
- NOT_AFFECTED: [CVE-2026-16742](https://security-tracker.debian.org/tracker/CVE-2026-16742), systemd-homed: daemon ausente no runner. Bibliotecas libsystemd/libudev não significam homed instalado/executado.
- NOT_AFFECTED: [CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538), Perl Archive::Tar: módulo Archive/Tar.pm ausente no perl-base desta imagem, verificado dentro do container. Não se aplica ao parser ZIP JavaScript usado pelo ExcelJS.
- RISCO LOCAL MITIGADO: util-linux [53613](https://security-tracker.debian.org/tracker/CVE-2026-53613), [76642](https://security-tracker.debian.org/tracker/CVE-2026-76642), [78408](https://security-tracker.debian.org/tracker/CVE-2026-78408), [78409](https://security-tracker.debian.org/tracker/CVE-2026-78409), [78410](https://security-tracker.debian.org/tracker/CVE-2026-78410): requerem montagem/nsenter privilegiados, configuração fstab/operador root ou direitos herdados. Runner não root, sem SUID/capabilities, no-new-privileges e sem mount/nsenter invocados pelo produto. Não declarar binário corrigido; reversão desses controles exige reabrir o gate.
- RISCO LOCAL MITIGADO: [CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369), libacl: requer chamador privilegiado de ACL e caminho mutável do atacante. Produto não chama ACL, não root e filesystem read-only. Correção envolve ABI novo; não trocar libacl por versão incompatível de outra distribuição.
- RISCO LOCAL MITIGADO: [CVE-2026-41992](https://security-tracker.debian.org/tracker/CVE-2026-41992), gzip: exige gzip -d sobre sequência LZW/LZH hostil. Aplicação não executa gzip de sistema sobre uploads; compressão HTTP por Node é outro caminho. Não usar essa imagem para processar arquivos arbitrários por shell.
- RISCO LOCAL MITIGADO: [CVE-2025-69720](https://security-tracker.debian.org/tracker/CVE-2025-69720), infocmp: entrada terminfo hostil para ferramenta CLI; produto não chama infocmp/terminal. Não fornecer terminfo não confiável a sessões de manutenção.

Sem correção Bookworm publicada para os riscos restantes no scan. Nenhum caminho HTTP correspondente foi identificado na aplicação. Aceite limitado à imagem de aplicação sem shell público e aos controles acima, não ao host Raspberry nem ao uso como imagem de automação privilegiada. Reavaliar na próxima revisão ou em 30 dias, e sempre que houver patch da base. A existência de binários vulneráveis continua registrada; não há alegação de teste de exploração universal. Matriz mecanicamente derivada do relatório: supply-chain/image-vulnerability-review.json.

## Privacidade e integridade

Não foram fornecidos ARG privados nem copiados .env, chaves de conta de serviço, chave de backup ou dados reais ao build. Contexto genérico exclui assets Atalaia/.private/node_modules/.next. Avisos Debian/Node/npm e módulos incorporados estão na imagem; fontes LGPL/GPL/MPL para distribuição externa ainda pendentes. O scanner de secrets e manifesto do pacote são controles distintos, registrados no relatório final.

Os emuladores e a imagem de ensaio são isolados e usam somente contas @example.invalid. O ensaio não é um restore de produção nem um novo RTO Firebase real. Gate 1 mantém sua evidência anterior.
