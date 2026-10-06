# Reconstrução de uma instalação

Estado: Gate 1 PASS para recuperação real Firebase/Auth com dados sintéticos nos dois laboratórios autorizados; backup/custódia de produção ainda BLOCKED. Perder o Raspberry não significa perder Firebase, mas perder os dois exige recuperar ativos independentes.

## Artefatos e custódia

1. Código de versão aprovada, package-lock, Dockerfile/Compose, scripts, regras/índices e documentação.
2. Backup criptografado consistente Firestore/Auth com manifestos e chave em cofre separado.
3. Configuração real criptografada fora do servidor: projeto/serviço, domínio, proxy, portas, segredos HMAC atuais e anteriores, parâmetros SCRYPT e chave AES.
4. Imagem Docker compatível com arquitetura do substituto e imagem anterior para rollback.
5. Inventário de região, Auth/providers/templates, IAM, regras, índices/TTL e infraestrutura. Exemplos versionados não são cópia da configuração real.

Um pacote de fonte genérica **não inclui dados, secrets, cartão, sistema operacional nem outros serviços do servidor**. Para gerar a partir de um commit limpo:

```sh
node scripts/release-artifact.cjs create .private/reconstruction-rc2
node scripts/release-artifact.cjs verify .private/reconstruction-rc2
```

O destino deve ser novo. O manifesto registra commit de origem, versão, transformação para marca genérica e SHA-256 de cada arquivo. Assets de empresa e relatórios operacionais são excluídos. Esse pacote ainda não está autorizado para distribuição pública; licença e direitos permanecem pendentes. Verifique também o checksum do arquivo de transporte recebido por canal confiável: um manifesto não assinado não prova autenticidade contra alguém que substitua arquivo e manifesto juntos.

Verifique integridade antes de instalar/gerar arquivos extras. npm ci/.env.local/.next mudam o diretório de trabalho; preserve o pacote original imutável para nova reconstrução. Os testes dev recriam .next: gere o artefato final após as suítes e confirme server.js antes de subir o standalone. Nunca substitua a aplicação real por build conectado ao projeto demo.

## Reconstruir após perda do servidor

1. Nomear responsável e registrar incidente sem anexar secrets. Identificar última cópia concluída e imagem/commit correspondentes.
2. Preparar Linux 64 bits, Docker/Compose, espaço, hora/NTP, rede e acesso ao Firebase. Não compartilhar a configuração privada com outras aplicações.
3. Verificar manifesto/checksum e reconstruir imagem pelo lockfile. Build exige internet para npm e a fonte Inter/Next; secrets administrativos ficam somente no runtime. A plataforma ARM64 deve usar dependências/imagem compatíveis.
4. Recuperar arquivo de configuração do cofre, com acesso restrito. Adaptar SITE_BIND_IP, NEXT_PUBLIC_APP_URL e eventualmente proxy/domínio. Rebuild é necessário quando configuração NEXT_PUBLIC muda; não há descoberta automática de IP no navegador.
5. Se Firebase original está preservado, confirmar projeto/UIDs e prontidão sem importar dados. Se perdeu o projeto, restaurar em projeto novo isolado autorizado; nunca importar primeiro sobre o destino em uso.
6. Recuperar Auth preservando UID e parâmetros SCRYPT, Firestore e configuração do serviço separadamente. Comparar contagens e vínculos users/UID; configurar e-mail/senha, regras/índices/IAM/providers. Sem hashes, adotar redefinição segura preservando UID; não recriar contas aleatoriamente.
7. Injetar segredos, conferir config:check, health e ready. Não executar bootstrap se ADMIN já foi restaurado; bootstrap só é primeiro acesso de instalação vazia.
8. Validar login ADMIN e RH, bloqueio de usuário inativo, troca obrigatória, logout, autorização, avaliações/duplicidade/anonimato, relatório/Excel e rate limiting em ciclo de laboratório. Não criar dados fictícios em produção como ensaio.
9. Liberar acesso interno após aceite, monitorar logs sem conteúdo pessoal e preservar rollback. Exposição pública é ação separada autorizada.
10. Registrar tempos reais, perda de dados desde a cópia e problemas; atualizar RPO/RTO a partir da execução.

## Critérios de aceite

PASS exige dados/UIDs/contagens coerentes, login e permissões corretos, duplicidade anterior preservada e secrets disponíveis. Restaurar só documentos não basta. Uma gravação parcial pode exigir novo destino isolado; scripts de backup não desfazem automaticamente importações parciais. O rollback da aplicação não reverte o estado do Firebase.

RPO de produção sem garantia. Laboratório cloud: RPO zero no snapshot sem gravações concorrentes; RTO 31 min 7,964 s incluindo navegador, com projetos já provisionados. Não é RTO frio do servidor nem SLA. Ver [relatório integral](FIREBASE-LAB-RESULT.md). Ver [matriz de recuperação](BACKUP-RESTORE.md) e [checklist](RELEASE-CHECKLIST.md).
