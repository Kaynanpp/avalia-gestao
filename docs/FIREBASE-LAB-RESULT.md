# Recuperação Firebase real — Gate 1 PASS

Ensaio concluído em 05/10/2026 exclusivamente nos dois laboratórios fonte/destino previamente autorizados. Dados e usuários inteiramente fictícios. Produção não consultada ou alterada; sem publicação, deploy no Raspberry, licença definitiva ou serviços pagos.

## Firebase laboratório

Authentication e-mail/senha ativado nos dois projetos; Firestore Standard em southamerica-east1. Cloud Billing confirmou billingEnabled=false antes e depois. Sem Blaze, bucket ou PITR; aplicação somente em loopback. Leitura Firestore sem autenticação recusada com HTTP 403 nos dois laboratórios.

Credenciais, parâmetros e evidência operacional permanecem privados e fora do Git. Ao terminar, duas chaves temporárias revogadas, quatro vínculos IAM dos executores removidos e arquivos locais dessas credenciais apagados; confirmação pela API aprovada. Laboratórios/dados sintéticos preservados, servidor local encerrado.

## Firestore

Snapshot lógico sem gravações concorrentes: **36 documentos**, incluindo usuários, setores, lideranças, colegas, ciclos, critérios, configurações, avaliações, participações, histórico e plano de desenvolvimento. Inclui subcoleção sob pai inexistente, Timestamp, GeoPoint, bytes, referências, mapas, arrays, NaN e Infinity. AES-256-GCM e manifestos de integridade; destino inicialmente vazio. Todos os digests iguais antes dos novos envios de teste. Nenhuma exportação gerenciada paga.

## Authentication e SCRYPT

**Quatro contas fictícias** exportadas com UID, hash/salt, perfil, flags e custom claims. Importação real com o mecanismo oficialmente suportado **Firebase Admin SDK auth.importUsers**, algoritmo SCRYPT e parâmetros originais da fonte, somente em memória/arquivos criptografados privados. As chaves SCRYPT originais dos projetos eram diferentes.

Senhas originais de ADMIN/RH funcionaram no destino. Conta desabilitada recusada. Troca obrigatória bloqueou acesso até alteração; nova senha aceita e anterior recusada. Reset ADMIN aprovado; reset RH recusado com 403; senha temporária de oito caracteres e troca obrigatória comprovados. Nenhum e-mail real enviado. Sessões/tokens anteriores não são restaurados.

Referências: [importUsers/SCRYPT](https://firebase.google.com/docs/auth/admin/import-users), [exportação e permissão de hashes](https://firebase.google.com/docs/auth/admin/manage-users), [Auth CLI](https://firebase.google.com/docs/cli/auth).

## UIDs e permissões

Quatro UIDs e claims preservados; vínculo Auth UID ↔ users/{uid} conferido. ADMIN e RH mantiveram permissões distintas. Claims não substituem o documento de autorização Firestore. Colaboradores participantes continuam cadastros sem conta Auth obrigatória.

## Avaliações, anonimato e navegador

- Participação HMAC anterior ao backup bloqueou repetição de liderança com 409. Novo envio 201, repetição 409; concorrência: exatamente um 201 e um 409.
- Elegibilidade por setor, participante/liderança inativos e ciclo encerrado validados no servidor; tentativas inválidas sem gravação.
- Colegas: quatro participantes únicos mantiveram resultado protegido; quinto liberou quantidade cinco/média quatro. Concorrência 201/409; replay recusado.
- Respostas/comentários sem identidade do avaliador, matrícula, hash de participação ou token. RH abriu relatório e Excel, analisado sem identificadores dos participantes. Histórico e plano preservados.
- Navegador restaurado mostrou liderança concluída desabilitada, outra disponível e colegas do próprio setor. Repetição entre colegas exibiu “Você já avaliou esta pessoa neste ciclo.”

Limitação de UX: a lista de colegas ainda permite selecionar pessoa já avaliada; servidor recusa o envio. Integridade comprovada independentemente do botão.

## Disaster recovery e RTO

Fonte compilada: commit **59cecd3aa3a279d7c2153dc642d1a0406fdd20c6**, versão 1.0.0-rc.2. Pacote genérico verificado de 247 arquivos; npm ci novo pelo lockfile, build de produção e standalone copiado para diretório temporário independente. Execução sem workspace/dependências originais nem credencial da fonte. Inspeção de 3.546 arquivos compilados sem material privado do ensaio.

| Medida | Observado |
| --- | --- |
| Snapshot | 36 documentos / 4 usuários / 28.838 bytes criptografados |
| Captura/criptografia | 5.113 ms |
| Restore Auth | 647 ms |
| Restore Firestore | 185 ms |
| npm ci novo | 360.232 ms |
| Build Windows isolado | 430.477 ms |
| Inicialização | 3.474 ms |
| Cópia/inspeção/validação standalone | 97.253 ms |
| RTO até API funcional/standalone independente | **25 min 46,856 s** |
| RTO incluindo navegador | **31 min 7,964 s** |

Início 18:34:02.514 UTC; API 18:59:49.370 UTC; navegador 19:05:10.478 UTC. Inclui tentativas corrigidas e intervenção do operador, com projetos já provisionados e backup disponível. Não inclui criação de projetos/conta, cartão/SO, DNS ou custódia externa; não é SLA, RTO do Raspberry ou benchmark para 500 funcionários. Reset administrativo validado adicionalmente após essa medição.

Problemas do executor resolvidos sem alterar a aplicação: links pnpm/EPERM substituídos por npm independente; erro de cache global resolvido com cache privado, sem apagar cache do usuário; teste de ciclo passou a usar alvo ainda não avaliado e conferir erro/ausência de gravação. Primeira cópia Linux omitiu tailwind.config.js; arquivo reposto com checksum conferido, build final aprovado.

## RPO e limites

**RPO zero somente para o ponto do snapshot sintético sem gravações concorrentes**, comprovado por digests. Novos envios posteriores excluídos deliberadamente. Backup/chave em arquivos privados separados no mesmo computador não provam custódia externa. RPO e backup real de produção continuam sem garantia operacional.

Reconstrução exige fonte/lockfile, snapshot Auth/Firestore, parâmetros SCRYPT originais, chave AES, HMAC estável e configuração/IAM/provedores/regras/índices/runtime. MFA recusado pelo importador atual; federação, entrega de e-mail, infraestrutura fria e volume real não ensaiados. Helper cloud restrito aos dois projetos explicitamente permitidos, dados sintéticos e destino vazio. portable-backup continua recusando restore cloud; produção não foi liberada.

## Validação posterior

| Verificação | Resultado |
| --- | --- |
| Unitários | 67 aprovados, incluindo 5 novos do guard/importador lab |
| Integração HTTP em emuladores | 13 aprovados |
| Recuperação criptografada em emuladores | 1 aprovado |
| Lint / TypeScript | PASS Windows/Linux |
| Build Windows | PASS, npm ci novo |
| Build Linux ARM64 / Node 24 | PASS, container temporário sem portas/deploy, configuração demo |
| Audit produção Windows/Linux | 0 vulnerabilidades relatadas |
| Audit completo | FAIL: 44 entradas, 42 high / 2 moderate / 0 critical, três advisories dev |
| Gate 2 | Pacote/snapshot local revalidados; ver checklist |

Linux usou dependências de validação existentes com lockfile conferido; não é segunda instalação npm do zero. Nenhuma vulnerabilidade suprimida ou atualização forçada. Nenhuma substituição da instalação do Raspberry.

## Decisão

**Gate 1 PASS no escopo integral do laboratório autorizado. NÃO PUBLICAR.** Restam backup real/custódia, configuração equivalente/cutover, direitos/licença/avisos de terceiros, canal de suporte e advisories dev. A comprovação do mecanismo Firebase está concluída; produção e distribuição continuam bloqueadas. Ver [checklist](RELEASE-CHECKLIST.md).
