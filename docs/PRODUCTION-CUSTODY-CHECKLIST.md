# Custódia e configuração equivalente de produção

Somente tipos de itens, nunca valores. Preparação documental PASS; disponibilidade/recuperação real do cofre e backup de produção **BLOCKED**. Os laboratórios não são cópia da configuração do cliente.

| Guardar | Local conceitual / controle | Verificação necessária |
| --- | --- | --- |
| Snapshot Firestore/Auth coerente, manifestos e digest | Mídia externa da empresa, somente arquivo AES-256-GCM, acesso operador/substituto | Abrir por executor privado, validar autenticação criptográfica e todos os digests sem imprimir dados |
| Chave AES e versão do envelope | Cofre separado da mídia e do Raspberry, acessível ao substituto | Testar desbloqueio; manter material de recuperação do cofre fora do mesmo ponto de falha |
| Parâmetros SCRYPT originais por projeto/versão | Cofre privado com ACL, junto ao inventário Auth protegido | Captura oficialmente suportada com getHashConfig; nunca NEXT_PUBLIC ou argumento gravado |
| Credencial administrativa/IAM e identidade do executor | Cofre externo ao servidor; preferir acesso temporário/restrito | Projeto e principal corretos, permissões mínimas de export/import; revogar chaves temporárias |
| HMAC de participação atual e versões anteriores | Cofre versionado, retenção coordenada com snapshots/ciclos | Mesma chave reconhece participações restauradas; não gerar chave nova arbitrária |
| Segredo de rate limit / bootstrap quando necessário | Cofre privado; não publicar senha bootstrap | Não usar bootstrap se ADMIN restaurado; manter contas desativadas/troca obrigatória |
| Arquivo completo de ambiente dedicado | Cópia criptografada em cofre, permissões restritas no runtime | Exportar nomes/tipos, não conteúdo em relatório; validar SITE_MODE, variáveis Firebase, HMAC e proxy |
| Configuração pública Firebase/Web e IDs do inventário | Inventário operacional privado versionado | NEXT_PUBLIC consistente entre build/runtime; chave Web não é autorização administrativa |
| Regras/índices Firestore, TTL, região e quotas | Fonte aprovada + inventário do estado implantado | Exemplos não comprovam implantação; captura de dados não recupera esses recursos |
| Auth providers, domínios autorizados, templates e política de senha | Inventário protegido de configuração | E-mail/senha e reautenticação; MFA/federação exigem procedimento específico |
| Domínio/DNS, proxy, portas, bind e URL pública | Inventário externo ao servidor | Rebuild se NEXT_PUBLIC mudar; caminhos relativos não substituem todos os links absolutos |
| Certificados/CA e chave privada, se usados | Chave em cofre; certificados públicos no inventário | Preservar cadeia, confiança, validade e renovação; não criar certificado novo sem decisão |
| Docker/Compose, arquitetura, imagem ativa/anterior, commit e checksum | Git privado/imagens aprovadas/mídia de recuperação | Build ARM64; conferir digest, usuário, permissões, volumes e rollback |
| SO/cartão, serviços, firewall, hora, rede e armazenamento | Inventário separado de infraestrutura | Pacote de fonte não copia SO/outros serviços; adaptar IP sem assumir descoberta automática |
| ADMIN/RH responsáveis e substitutos | Cadastro privado controlado | Conta de acesso existente, UID/role/active/mustChange preservados, sem guardar senha em documentação |
| Acesso e recuperação do cofre | Custodiante e substituto designados | Exercício sem leitura pública de secrets; plano se perder mídia, conta Windows ou cofre |

## Execução condicionada

1. Conferir mídia física/destino, dono/ACL, espaço e disponibilidade do cofre separado. Não gravar snapshot real em compartilhamento de scanners, Git, laboratório ou pasta temporária pública.
2. Validar orçamento/quota de leitura sem contratar serviço. Nenhuma exportação gerenciada/bucket pago foi autorizado.
3. Definir janela sem gravações de todos os escritores. Parar somente a aplicação de avaliação, quando aprovado e seguro; não parar outros serviços do Raspberry. Captura sequencial com escritores ativos não é snapshot consistente.
4. Export lógico criptografado Firestore + Auth; obter parâmetros SCRYPT e configuração em cofre, incluindo segredo HMAC estável. Não registrar conteúdo Auth ou senha.
5. Conferir digests/contagens e envelope em memória, gravar evidência agregada e checksum em canal confiável. Checksum sozinho não verifica capacidade de decrypt/restaurar nem autenticidade contra substituição conjunta.
6. Guardar uma cópia fora do servidor, chave no cofre e verificar leitura pelo substituto. Não executar restore sobre produção. Gate 1 já comprovou mecanismo; novo teste completo só quando necessário.
7. Somente depois avaliar deploy e preservação da imagem anterior; rollback de imagem não reverte gravações no Firebase.

## Situação em 06/10/2026

Responsável autorizou arquivo criptografado em mídia externa e chave em cofre separado, delegando a escolha. Escolha operacional proposta: mídia removível exclusiva da empresa sob guarda física do responsável, snapshots em pasta AvaliaGestao-Backups; chave em gerenciador de senhas/cofre distinto, com acesso do responsável e substituto. Nenhuma mídia removível estava conectada; disco local e compartilhamento de uso geral não comprovam essa custódia. Cofre externo recuperável ainda não disponibilizado. A escolha está preparada; faltam disponibilização dos recursos e prova de acesso, não uma autorização genérica para usar produção.

Backup real não executado; nenhum dado de cliente copiado; deploy não feito. Não inferir que backup do cartão ou laboratório cobre Firebase/segredos de produção. Não criar credencial de produção enquanto o destino seguro não estiver pronto.

Inventário somente leitura do servidor: configuração dedicada presente com permissões 0600; tipos/nomes de variáveis de Firebase, HMAC, URL/bind/porta e política de avaliações identificados sem registrar valores. Container saudável e imagem idêntica à baseline 20a6c87 preservada. Isso confirma existência local/rollback de imagem, não acesso ao cofre externo, captura da configuração inteira em custódia ou equivalência funcional da RC2 com produção. Nenhuma configuração foi alterada.
