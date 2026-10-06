# Projeto técnico de organizações

Estado: proposta; nenhuma migração executada.

A v1 utiliza um projeto Firebase por empresa. Para Cloud, o tenant será uma organização com ID imutável, nome, status, região, política de retenção e edição contratada. O ID será resolvido no servidor a partir de uma associação autenticada ou de um endereço público validado; nunca será aceito livremente do corpo da requisição.

## Modelo proposto

Preferir subcoleções em `organizations/{organizationId}`. Cada repositório receberá um contexto obrigatório de organização. Isso reduz consultas globais acidentais. Firebase Auth continua central, com memberships em `organizations/{id}/memberships/{uid}`; papéis são válidos apenas dentro da organização. Claims são auxiliares, e a associação ativa deve ser conferida no servidor.

| Coleção atual | Destino/ownership futuro |
| --- | --- |
| users | memberships por organização; perfil global mínimo separado |
| departments | departments da organização |
| managers | leaderships da organização; IDs antigos preservados na migração |
| coworkers | coworkers da organização |
| evaluationPeriods | periods da organização |
| criteria | criteria da organização |
| evaluations | leadershipEvaluations da organização |
| peerEvaluations | peerEvaluations da organização |
| leadershipParticipation | participação da organização, sem ligação à resposta |
| peerParticipation | participação da organização, sem ligação à resposta |
| peerEvaluationTokens | tokens legados da organização |
| selfEvaluations / selfEvaluationTokens | histórico da organização, escrita encerrada |
| submissionTokens | controle legado da organização |
| settings/app | settings/app da organização |
| developmentPlans | plans da organização |
| auditLogs | auditoria da organização |
| securityRateLimits | contadores com namespace da organização; proteção global separada |

Relatórios, comentários e exports são derivados exclusivamente de dados do tenant. Arquivos futuros usarão prefixo da organização e URLs temporárias. Logs terão ID técnico do tenant sem respostas, comentários ou matrículas.

## Isolamento

- Nenhum serviço pode usar uma coleção global sem contexto explícito.
- RBAC deve validar membership, status da organização e troca obrigatória de senha.
- Sessões precisam de organização selecionada e revalidação em cada operação.
- Participação HMAC deve incorporar organizationId e segredo versionado; não reaproveitar a mesma chave de pares entre tenants.
- URLs de avaliação resolvem organização e ciclo antes de identificar matrícula.
- Cache deve incluir tenant em todas as chaves; exports e jobs capturam contexto no início.
- IDs de alvo, setor, ciclo e critérios são buscados somente dentro do namespace autenticado.

## Queries e índices

Versionar índices compostos por subcoleção para status/data dos ciclos, setor/status das lideranças e pessoas, ciclo/alvo das avaliações, data/ação da auditoria e prazo/status dos planos. Consultas collectionGroup administrativas globais ficam reservadas a tarefas operacionais explicitamente autorizadas. Nenhum painel de empresa usa collectionGroup global.

## Migração compatível

1. Backup e restauração ensaiados.
2. Criar uma organização para a instalação existente.
3. Copiar documentos preservando IDs e timestamps para namespace novo em ferramenta com dry run e manifesto de contagens.
4. Manter leitura antiga durante validação; nenhuma exclusão inicial.
5. Preservar algoritmo de hashes antigos para os ciclos existentes por versão explícita.
6. Validar contagens, relatórios, sessões, tokens e duplicidade antes do corte.
7. Realizar corte em janela sem gravações; rollback mantém estrutura antiga.
8. Remover legado somente por processo separado de retenção aprovado.

## Testes exigidos antes do Cloud

Usuário A nunca acessa dados de B, mesmo alterando ID, organização, URL ou filtros. Testar listagens, mutações, exports, jobs, caches, arquivos, logs, matrícula igual em duas empresas, administradores com memberships distintos, organização suspensa, troca de tenant na sessão e concorrência. Executar testes HTTP e banco real em emulador, incluindo todos os repositórios. O Cloud só avança após revisão independente desses controles.

## Lacunas operacionais fechadas no design — etapa 3

- Provisionamento: criar organização em estado PENDING, validar região/projeto, criar membership administrativo e só ativar após verificação de operação. Falha não libera acesso parcial.
- Auth: decidir se UIDs são globais com memberships ou se Identity Platform tenants são usados. A instalação atual não implementa nenhum desses caminhos. Cookies devem ser host-only; trocar organização exige autorização servidor e renovação do contexto.
- Rate limit: namespace por organização/identificador e proteção global contra abuso. Não compartilhar hashes de matrícula entre tenants. Registrar versão do segredo e plano de rotação compatível.
- Recuperação: manifesto por organização, mesmo UID para memberships, validação de contagens e recuperação seletiva em namespace vazio. Export completo de servidor Cloud não pode ser fornecido a uma empresa.
- Jobs: contexto imutável com tenantId, estado da organização revalidado antes de execução e idempotência por tenant/job. Não usar a organização atualmente selecionada pelo operador como contexto implícito.
- Exclusão/retenção: fluxo separado de atualização, com aprovação, export solicitado, preservação legal aplicável e estado suspenso durante processamento. Nenhum dado foi excluído nesta etapa.
- Quotas: limitar requisições, exports, imports e jobs por organização; não usar limites comerciais na interface como autorização. Medir custos antes de oferecer planos.
- Observabilidade: IDs técnicos de tenant/request sem matrícula, comentário ou nota. Operadores globais têm acesso excepcional registrado; suporte não recebe bypass automático.
- Critério de aceite: matriz negativa cobrindo todos os endpoints, jobs, arquivos, caches e relatórios; ensaio de backup/restore por organização; teste de concorrência e rollback da migração em cópia isolada.

Somente design. Não há namespace multiempresa implementado, nova organização de produção, migração ou cobrança.
