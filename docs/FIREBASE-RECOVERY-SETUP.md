# Preparar o ensaio Firebase real

Gate 1 concluído em 05/10/2026 nos dois laboratórios gratuitos previamente autorizados: Auth, SCRYPT real, UIDs, Firestore e aplicação restaurada aprovados. Consulte [evidência](FIREBASE-LAB-RESULT.md); não reexecute sobre esses destinos ocupados. Os passos abaixo orientam um novo ensaio autorizado, não produção. Chaves/permissões temporárias do ensaio foram revogadas.

## Entregar o ambiente, sem enviar secrets pelo chat

1. No console Firebase, criar/selecionar projeto de laboratório vazio sob a conta da empresa. Não reaproveitar o projeto atual. Anotar ID/dono/região e confirmar orçamento/quotas; não ativar billing sem decisão própria.
2. Ativar Authentication com provedor e-mail/senha, adicionar somente o domínio local/de homologação necessário. Criar Firestore na região aprovada; conferir custos e limites do plano antes de leituras/importações.
3. Criar aplicação Web e obter configuração pública. Criar conta de serviço para o executor isolado com permissões mínimas de Firestore/Auth. A leitura de hashes no projeto fonte exige firebaseauth.configs.getHashConfig; essa permissão é sensível e não deve ser concedida ao site institucional.
4. Colocar credencial e parâmetros de hash em cofre/arquivo privado fora do Git. Não colar chave, JSON Auth, hash ou senha neste chat. No chat, informar apenas o ID do destino e que está vazio/autorizado.
5. Para provar SCRYPT sem levar informações reais, usar contas ADMIN/RH fictícias em um projeto fonte de laboratório distinto do destino. Exportar com mecanismo oficial, preservar UID e obter parâmetros de hash desse projeto fonte. Configurar usuários/roles/flags correspondentes em Firestore.
6. Importar em destino vazio autorizado com Firebase CLI/Auth importUsers e parâmetros originais; conferir relatório de importação sem imprimir hashes. O script portable-backup não executa restore cloud. O helper firebase-lab-recovery aceita somente a dupla de laboratórios explicitamente permitida, destino vazio e dados sintéticos; não libera importação em produção. Firestore e configurações são recuperados separadamente conforme matriz.
7. Construir/iniciar cópia da aplicação apenas com config de laboratório. Validar login original fictício ADMIN/RH, UID/users, permissões, troca obrigatória, redefinição de senha e nova sessão. Não testar cookies antigos do projeto anterior como recuperação.
8. Conferir ciclos/participação/anonimato/relatórios/exportação com dados fictícios e registrar tempo, contagens, versões e status. Nenhum teste escreve em produção.

## Depois do laboratório

Para backup do cliente, decidir pausa de gravações, executor, destino criptografado fora do servidor, permissão/custo de leituras e retenção. Somente então executar snapshot real; nunca assumir que o backup do cartão cobre o Firebase. A validação do laboratório comprova mecanismo, não a existência/integridade da cópia do cliente.

Se hashes não forem exportáveis, preparar recuperação por redefinição de senha preservando UIDs, comunicação privada aos responsáveis e bloqueio de contas inativas. Não inventar senha antiga nem alegar recuperação transparente.

Referências oficiais: [import/export Auth](https://firebase.google.com/docs/cli/auth), [importUsers](https://firebase.google.com/docs/auth/admin/import-users), [permissões para leitura de hashes](https://firebase.google.com/docs/auth/admin/manage-users). Não há instalação Firebase local capaz de substituir a comprovação SCRYPT real sem esse ensaio.
