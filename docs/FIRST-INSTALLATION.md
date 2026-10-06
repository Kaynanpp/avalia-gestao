# Primeira instalação e configuração

## Fluxo atual sem edição manual do banco

1. Responsável técnico prepara servidor, Firebase e `.env.pi`.
2. Valida a configuração com `scripts/check-environment.cjs`.
3. Sobe o contêiner e confirma `/api/health` e `/api/ready`.
4. Cria o primeiro ADMIN pelo script protegido de bootstrap.
5. O ADMIN entra com a senha temporária e é obrigado a substituí-la.
6. No painel, configura empresa, outros usuários, setores, colaboradores, lideranças, critérios e períodos.
7. Abre um ciclo de teste e valida avaliação e relatório.

## Primeiro administrador

Execute em terminal privado. A senha temporária aparece uma vez:

```sh
docker compose --env-file .env.pi run --rm \
  -e BOOTSTRAP_ADMIN_ALLOW=true \
  -e BOOTSTRAP_ADMIN_EMAIL="admin@empresa.com" \
  -e BOOTSTRAP_ADMIN_NAME="Administrador" \
  app node scripts/bootstrap-admin.cjs
```

O script recusa a operação se já existir um ADMIN ativo. Depois do primeiro acesso, crie outras contas pela área **Usuários**.

## Ordem recomendada no painel

1. **Configurações:** nome da empresa, nome do produto e mínimo de anonimato.
2. **Usuários:** segundo ADMIN de contingência e contas RH/DP.
3. **Setores:** estrutura ativa da empresa.
4. **Colaboradores:** importação com prévia; corrigir todas as linhas inválidas.
5. **Lideranças:** setor, cargo e nível de liderança.
6. **Critérios:** revisar modalidades Liderança, Colegas ou Ambas.
7. **Períodos:** criar ciclo planejado, conferir datas e modalidades e depois abrir.
8. **Teste:** usar matrículas fictícias do setor de teste e confirmar bloqueio de duplicidade.
9. **Relatórios:** conferir que resultados permanecem ocultos abaixo do mínimo.

## Pontos ainda técnicos

- Criação do projeto Firebase, conta de serviço, regras, índices e primeiro ADMIN.
- Configuração de domínio/proxy quando houver publicação externa.
- Backup e restauração.

O restante da operação é feito no painel. Um assistente web de bootstrap não foi criado porque uma instalação aberta sem administrador poderia ser tomada por outra pessoa na rede. O comando explícito mantém a primeira concessão de acesso sob controle do responsável técnico.

## Aceite da instalação

- Dois administradores ativos.
- Segredos guardados fora do servidor.
- Health e readiness aprovados.
- Login, troca de senha e logout aprovados.
- Ciclo de teste conclui liderança e colegas sem duplicidade.
- Relatórios respeitam o mínimo de anonimato.
- Backup solicitado e restauração de teste agendada.
- Imagem de rollback identificada.

A instalação privada inclui a marca da empresa. Para distribuição genérica, configure a identidade de build conforme a seção seguinte; o painel configura nomes, mas não oferece upload de logo.

## Evolução de identidade — etapa 3

A instalação genérica pode usar NEXT_PUBLIC_COMPANY_BRAND=generic e NEXT_PUBLIC_COMPANY_NAME no build. O painel continua configurando os nomes operacionais; não existe upload de logo. A instalação privada mantém o logo anterior por padrão. Redistribuição dos assets de uma empresa depende de autorização específica.

O aceite comercial exige restauração concluída e validada, não apenas agendada. O ensaio local fictício está registrado no guia de recuperação; as contas SCRYPT reais e a recuperação operacional da instalação ainda precisam de ensaio próprio.

## Firebase dedicado sem conhecimento interno

No projeto novo da empresa, ativar Authentication por e-mail/senha e Firestore na região aprovada; obter configuração Web em Configurações do projeto e uma credencial Admin privada com permissões mínimas. Preencher todos os campos do exemplo .env.pi, inclusive PARTICIPATION_SECRET, IP/porta e URL alcançável pelos dispositivos. Guardar credencial e secrets em cofre, não no código/imagem. Regras bloqueiam acesso direto do cliente; publicar regras/índices somente no ID confirmado. Projeto já existente exige revisão/mescla antes de publicar índices.

O comando bootstrap acima usa entrypoint node do container por argumentos e não exige edição manual de users. Não executar em instalação restaurada com ADMIN existente. Interface RH exige Auth e documento users com o mesmo UID; matrícula de participante não cria conta Auth.

Build precisa de internet para registro npm, imagem base e Inter via next/font. Um host novo precisa Docker/Compose instalado, hora correta e porta livre. A versão genérica deve usar build NEXT_PUBLIC_COMPANY_BRAND=generic; alterar NEXT_PUBLIC depois requer novo build. Trocar máquina/IP exige editar config pública e rebuild, não apenas copiar o diretório.

O teste de instalação rc.2 usa pacote verificado sem reutilizar .env.local privado, emuladores novos e bootstrap verdadeiro, seguido de troca obrigatória, ADMIN/RH e logout. Isso valida o caminho local, não provisionamento IAM/billing real. Distribuição Community pública aguarda licença e recuperação cloud.

No laboratório compilado com NODE_ENV=production e emuladores, /api/ready retorna 503 deliberadamente; isso testa a recusa de configuração inadequada à produção. Health/login/bootstrap continuam exercitáveis no laboratório. As suítes HTTP normais em modo desenvolvimento exigem ready 200. Não alterar a proteção para aprovar instalação com emulador em produção real.
