# Backup e restauração

## Matriz de recuperação — etapa 4

| Componente | Backup | Restore | Validado | Observação |
| --- | --- | --- | --- | --- |
| Firestore | Captura lógica criptografada de documentos/subcoleções | Emulador vazio; import gerenciado como procedimento separado | PASS em emuladores e cloud real sintético (36 documentos) | Não inclui índices, regras, TTL, região, IAM ou PITR; pausar gravações para consistência |
| Firebase Auth | UID, perfil, providers, claims e hash/salt quando permitido | Import suportado Firebase com parâmetros originais; portable-backup somente emulador, helper cloud somente laboratório | PASS SCRYPT real, 4 contas fictícias, UIDs/login/permissões | Hashes exigem permissão getHashConfig; senha em texto puro nunca é backup |
| Configuração | Exemplos versionados; arquivo real externo criptografado | Preencher/recuperar arquivo privado e validar | Exemplos conferidos; cópia real não validada | URLs/IPs precisam ser adaptados e build público reconstruído |
| Aplicação | Git privado, lockfile e pacote de reconstrução | npm ci/build ou Docker | RC2 revalidado Windows e Linux ARM64; reconstrução cloud independente aprovada | Não é imagem completa do cartão |
| Arquivos | Assets versionados; arquivos adicionais exigem inventário próprio | Copiar somente arquivos autorizados | Assets fictícios conferidos | Não existe upload de arquivos de usuário nesta versão; não presumir cópia de todo o host |
| Secrets | Cofre externo independente, ainda sob responsabilidade do operador | Injetar no runtime, nunca no build público | BLOCKED: custódia real não comprovada | Perder chave AES impede decrypt; perder segredo HMAC prejudica reconhecimento das participações |
| Docker/runtime | Dockerfile, Compose e imagem anterior preservada | Reconstruir para arquitetura correta; conferir configuração | Boot isolado da imagem anterior aprovado | Proxy, SO, certificados, volumes e outros serviços do host não estão no backup lógico |

### Autenticação e associação com os dados

O login RH/ADMIN usa e-mail/senha no endpoint Firebase Authentication pelo servidor. O ID token é validado e convertido em cookie de sessão de cinco dias. Em cada autorização, o servidor revalida o cookie/revogação e busca `users/{uid}` no Firestore, verificando active/deleting, role e mustChangePassword. Papéis também podem existir nas custom claims, mas restaurar somente claims não substitui o documento users. Colaboradores participantes são cadastros com matrícula; não são contas Auth.

Authentication guarda identidades, senha derivada/hash, providers, UID, flags e claims. Firestore guarda perfil administrativo e autorização, cadastros, avaliações, participações e configurações. Recuperar Firestore sem Auth deixa contas sem login; recriar e-mails com UIDs novos não reata documentos automaticamente. O import deve preservar UID e comparar os vínculos antes de liberar acesso. Após perda/troca do projeto, cookies e tokens antigos não devem ser reaproveitados; renovar login e configurar projeto/API key/domínio/conta de serviço. Configurar novamente e-mail/senha, domínios autorizados e templates/provedores externos conforme inventário protegido.

O export Auth não protege senha em texto puro nem configuração do projeto. Sem hashes recuperáveis e parâmetros SCRYPT originais, reconstruir identidade preservando UID e iniciar redefinição segura de senha por canal validado; não prometer que a senha anterior funcionará. MFA, provedores federados, templates, chaves de serviço, IAM, índices/TTL e infraestrutura requerem procedimentos próprios. O backup lógico recusa MFA no restore atual. Restauração cloud não foi liberada no script local. Helper separado restringe a dupla de laboratórios, dados sintéticos e destino vazio; o ensaio aprovado não autoriza restore de produção.

### Gate real concluído — 05/10/2026

**Gate 1 PASS** nos dois laboratórios previamente autorizados. Exportação criptografada real de 36 documentos e quatro contas; importação SCRYPT pelo Admin SDK, UIDs/claims e vínculos users preservados. Login ADMIN/RH, troca obrigatória/reset, avaliações, duplicidade/concorrência, anonimato, relatórios/Excel e navegador aprovados em standalone independente. Configuração e-mail/senha ativa, faturamento desabilitado, executores temporários revogados. [Relatório completo](FIREBASE-LAB-RESULT.md).

RTO observado 31 min 7,964 s incluindo navegador, a partir de projetos já provisionados e backup disponível. RPO zero apenas no snapshot sintético sem gravações. Não comprova backup real de produção, custódia externa, reconstrução fria da infraestrutura nem SLA. Nenhum dado real foi copiado ou serviço pago ativado. Sessões antigas exigem novo login; segredo HMAC estável é necessário para preservar participações.

Referências: [gestão/exportação Auth](https://firebase.google.com/docs/auth/admin/manage-users), [importação SCRYPT](https://firebase.google.com/docs/auth/admin/import-users).

## Escopo

Uma instalação possui dois conjuntos de ativos:

1. **Firebase:** Firestore, usuários do Firebase Authentication, configuração e índices.
2. **Servidor:** código/versionamento, `.env.pi`, configuração do proxy e imagem Docker anterior.

O export gerenciado do Firestore não inclui usuários do Firebase Authentication nem os segredos do servidor. Esses itens precisam de controles próprios.

## Estratégia recomendada

| Ativo | Frequência | Retenção mínima sugerida | Destino |
| --- | --- | --- | --- |
| Firestore completo | diária | 7 diárias, 4 semanais, 12 mensais | Bucket Cloud Storage restrito |
| Configuração `.env.pi` | após cada alteração | atual + duas anteriores | cofre criptografado fora do Raspberry |
| Código e imagem | a cada versão | versão ativa + duas anteriores | Git privado e imagens locais/registry privado |
| Auth JSON e parâmetros de hash | diária junto ao Firestore e antes de mudança crítica | mesma retenção aprovada para os dados | cofre criptografado do responsável |

Retenção final depende do contrato e da política LGPD da empresa. Backups não devem prolongar dados além do período autorizado.

## Pré-requisitos do export gerenciado

O export/import nativo do Firestore exige faturamento habilitado, bucket do Cloud Storage em localização compatível e permissões adequadas. A operação gera leituras e armazenamento cobrados. Por isso a automação foi preparada, mas não ativada sem decisão do proprietário.

Referências oficiais:

- [Exportar e importar dados do Firestore](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [Referência do comando de exportação](https://cloud.google.com/sdk/gcloud/reference/firestore/export)

## Executar backup

Use Cloud Shell ou um executor administrativo separado do Raspberry. Não copie credenciais de longa duração para o cartão.

```sh
export FIREBASE_PROJECT_ID="projeto-da-empresa"
export FIRESTORE_BACKUP_BUCKET="bucket-restrito"
export FIRESTORE_BACKUP_ALLOW=true
sh scripts/firestore-backup.sh
gcloud firestore operations list --project "$FIREBASE_PROJECT_ID"
```

O retorno inicial confirma somente que a operação foi solicitada. O backup é considerado concluído depois que a operação aparece como concluída e os objetos existem no bucket.

Configure uma regra de ciclo de vida no bucket para a retenção aprovada. Restrinja leitura e escrita ao executor de backup, ao agente do Firestore e aos responsáveis pela recuperação.

## Backup da instalação

Após mudar configuração ou versão:

```sh
tar -czf avalia-gestao-config-$(date +%Y%m%d).tgz .env.pi docker-compose.yml
docker image inspect avalia-gestao-app:latest >/dev/null
```

O arquivo contém segredo e deve ser criptografado antes de sair do servidor. Não o envie ao Git, e-mail ou mensageiro.

## Teste de restauração

Execute trimestralmente e antes de uma mudança de alto risco:

1. Crie ou selecione um projeto Firebase de recuperação isolado e autorizado.
2. Escolha um export concluído, nunca um diretório parcial.
3. Confirme que o projeto de destino não é produção.
4. Execute:

   ```sh
   export FIREBASE_RESTORE_PROJECT_ID="projeto-teste-recuperacao"
   export FIRESTORE_RESTORE_CONFIRMED_PROJECT="$FIREBASE_RESTORE_PROJECT_ID"
   export FIRESTORE_EXPORT_METADATA_URI="gs://bucket/caminho/caminho.overall_export_metadata"
   export FIRESTORE_RESTORE_ALLOW=true
   sh scripts/firestore-restore.sh
   ```

5. Acompanhe `gcloud firestore operations list`.
6. Configure uma cópia da aplicação apontando para o projeto restaurado.
7. Valide contagens de setores, colaboradores, lideranças, períodos e avaliações.
8. Teste login com contas de recuperação criadas especificamente para o ensaio.
9. Teste relatórios e anonimato sem usar a instalação de produção.
10. Registre data, export utilizado, duração, resultado e falhas encontradas.

## Recuperação real

Uma importação mescla documentos e não desfaz automaticamente alterações parciais. Antes de importar em produção, interrompa gravações, gere um export do estado atual, confirme o projeto duas vezes e aprove uma janela de manutenção. Usuários do Firebase Authentication precisam de procedimento separado; não presuma que foram restaurados com o Firestore.

## Critério de sucesso

Backup existe, operação terminou, retenção está aplicada, acesso está restrito e uma restauração em ambiente isolado foi validada. Apenas possuir arquivos no bucket não conclui o processo.

## Situação desta etapa

Scripts e procedimento preparados; nenhum export pago, agendamento, política de retenção ou ensaio de restauração foi executado nesta etapa. Relatório de usuários Auth não recupera hashes de senha e não deve ser tratado como backup completo de autenticação. Uma instalação comercial exige export Auth compatível e teste de recuperação antes do aceite.

Este registro descreve a etapa anterior. O ensaio lógico da etapa 3 e seus limites estão registrados abaixo; o export gerenciado permanece sem ativação.

## Backup lógico criptografado para instalação dedicada

`scripts/portable-backup.cjs` captura documentos de todas as coleções/subcoleções, inclusive filhos de pais ausentes, e contas Authentication. Preserva IDs, timestamps com nanossegundos, referências, mapas, bytes e geopontos. O arquivo é criptografado com AES-256-GCM e possui manifestos SHA-256 internos. A chave de 32 bytes em base64 fica em `BACKUP_ENCRYPTION_KEY`, fora do arquivo e do Git. Perder essa chave impede recuperar o backup. Guarde-a em cofre independente e teste o acesso.

```sh
# Executor privado, com variáveis de serviço já configuradas e chave no cofre.
node scripts/portable-backup.cjs export PROJETO_CONFIRMADO /DESTINO_PRIVADO/snapshot.backup.enc --allow-cloud-read
```

Leitura cloud exige projeto idêntico a `FIREBASE_ADMIN_PROJECT_ID`. Não altera dados, mas gera leituras normais do Firestore e está sujeita à quota/faturamento existente. Não agenda serviços nem cria buckets. Para consistência entre Auth e Firestore, interrompa gravações durante toda a captura; sem isso é apenas uma cópia sequencial, sem garantia de snapshot atômico. O export lógico não substitui os serviços gerenciados para grandes volumes ou recuperação por ponto no tempo.

A restauração deste script é deliberadamente limitada a projeto `demo-*`, Auth e Firestore em `127.0.0.1`, ambos vazios. Não restaura sobre produção. Guarde também regras, índices, configuração, imagem e segredos do aplicativo; esses itens não estão no arquivo de dados.

Para importar hashes reais SCRYPT em ambiente de recuperação, são necessários os parâmetros originais do Firebase em variáveis privadas `AUTH_HASH_KEY`, `AUTH_HASH_SALT_SEPARATOR`, `AUTH_HASH_ROUNDS` e `AUTH_HASH_MEMORY_COST`. O script bloqueia se faltarem. O emulador não prova compatibilidade criptográfica dos hashes reais: o ensaio real sintético foi aprovado (ver FIREBASE-LAB-RESULT); hashes/configuração/custódia do cliente ainda exigem validação antes de prometer recuperação de produção.

## Reproduzir ensaio gratuito

```sh
# Node 24, Java 21, portas 8080/9099/3006 livres; dados exclusivamente fictícios.
npx firebase emulators:exec --config firebase.recovery.json --only auth,firestore --project demo-avalia-gestao "npm run test:recovery"
```

A suíte exporta do projeto fictício de origem e importa em outro namespace vazio. O arquivo criptografado fica no diretório temporário do sistema; apenas contagens e durações são gravadas em `artifacts/recovery-result.json`, ignorado pelo Git.

Verificações: usuários/UIDs e senha, setores, pessoas, liderança, ciclo, critérios, configurações, plano, avaliações, participações, subcoleções e tipos; integridade criptográfica; recusa de destino ocupado; login; relatórios; Excel; readiness; duplicidade nova e anterior ao backup. Não existe uso de dados reais neste ensaio.

### RPO e RTO

Sem agendamento efetivo, o RPO da instalação atual não tem limite garantido: pode perder todas as alterações desde o último backup confirmado. Um backup diário concluído teria meta de até 24 horas, ainda não um compromisso operacional.

O RTO medido pelo ensaio cobre somente restaurar o conjunto fictício e validar funções em emuladores locais já disponíveis. Não inclui aquisição de cartão, provisionamento, rede, credenciais, restauração SCRYPT real nem DNS. Esses tempos precisam de um ensaio operacional antes de oferecer SLA.

### Resultado observado — 05/10/2026

Ensaio aprovado: 25 documentos e 1 conta fictícia, arquivo criptografado de 19.022 bytes. Captura: 1.230 ms. Restauração, comparação de integridade e verificações HTTP: 85.830 ms. A duração total do teste foi 93.734 ms, sem contabilizar inicialização dos emuladores/servidor. Não extrapolar esse resultado para o banco de produção.

Problemas encontrados e corrigidos: exigência de opções de hash pelo SDK, formato raw de fakeHash/fakeSalt do Auth Emulator incompatível com a conversão base64 do importador padrão, e normalização do armazenamento de timestamps para microssegundos. O teste preserva exatamente o timestamp devolvido pelo banco. Login com a senha original fictícia aprovado; participação anterior ao backup continuou recusando novo envio com HTTP 409. Produção não foi acessada pelo ensaio.

Reexecução final aprovada pelo seletor `--recovery`: 25 documentos, 1 conta, 19.030 bytes criptografados; captura 1.458 ms, restauração/verificações 88.954 ms, teste 97.859 ms. O tamanho varia com timestamps e metadados do conjunto gerado. Integridade, login, relatório, Excel, readiness, envio novo 201 e duplicidades 409 aprovados. Destino ocupado, chave errada e adulteração recusados. A suíte encerrou os emuladores sem tocar produção. Ainda não prova recuperação de senhas SCRYPT reais nem RTO operacional completo.

Etapa 4, Linux ARM64/Node 24/Java 21 isolado: reexecução rc.2 aprovada com 25 documentos/1 conta, 19.030 bytes, captura 767 ms, restauração/verificações 44.072 ms, teste 49.799 ms. Variação de máquina/cache não altera os limites da prova: snapshot fictício, emuladores e nenhuma produção acessada. Não substituir RTO operacional por esse tempo. Primeiro acesso compilado também foi validado; readiness recusa deliberadamente emulador em NODE_ENV production.

## Recuperação das contas de acesso

Exporte Authentication separadamente pelo Firebase CLI em executor privado:

```sh
umask 077
firebase auth:export /CAMINHO_FORA_DO_REPOSITORIO/auth-backup.json --format=json --project PROJETO_CONFIRMADO
```

Guarde, em cofre separado, os parâmetros do algoritmo de hash exibidos em Authentication > Users > Password hash parameters. O JSON contém dados pessoais e hashes de senha; não publique nem registre seu conteúdo.

Na recuperação isolada, use `firebase auth:import` com o projeto de destino explícito e os parâmetros originais. Execute em terminal administrativo sem compartilhamento/gravação de comandos. Confirme os UIDs antes da importação, pois contas existentes com o mesmo UID podem ser sobrescritas. Depois, teste login com uma conta fictícia incluída no ensaio, revogue sessões antigas e confira que os documentos `users` restaurados possuem os mesmos UIDs. Se não houver hash recuperável, siga um processo de redefinição de senha; não prometa restauração transparente.

A [documentação do Firebase CLI](https://firebase.google.com/docs/cli/auth) informa os parâmetros exigidos e as limitações de exportação de senhas de outros algoritmos. Não execute import em produção para ensaiar a recuperação.
