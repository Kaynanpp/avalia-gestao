# Testes de integração HTTP

Os testes usam Firebase Auth e Firestore reais em emuladores, sem credenciais ou dados de produção. Exigem Java 21, Node 24 e a porta local 3006 livre.

```sh
npm ci
npx firebase emulators:exec --only auth,firestore --project demo-avalia-gestao "npm run test:integration"
```

O executor inicia e encerra o servidor local automaticamente, fixa o projeto demonstrativo e descarta credenciais administrativas do ambiente do processo filho. As portas dos emuladores precisam estar em 127.0.0.1. Execute com emuladores novos e sem importar uma sessão anterior; a suíte recusa sobrescrever seu ciclo de teste existente.

Cobertura: sessão real, papel RH/ADMIN, ausência de sessão, payload, mesma origem, matrícula/setor, pessoa/liderança inativas, unicidade por alvo/ciclo, concorrência no Firestore, anonimato das respostas, mínimo de cinco participantes, relatório de colegas, Excel, preservação de histórico, período encerrado, senha obrigatória e rate limit concorrente persistente.

A suíte unitária continua independente: `npm test`. O CI executa ambas e um build Linux. Nenhum workflow foi executado no GitHub nesta etapa, pois o repositório continua local e sem publicação.

Os testes de navegador desta etapa foram manuais no mesmo ambiente fictício. Não existe ainda suíte automatizada de navegação visual em CI.

## Recuperação e site — etapa 3

Execute `npm run test:recovery` via `firebase emulators:exec --config firebase.recovery.json --only auth,firestore --project demo-avalia-gestao`. O runner seleciona uma suíte separada e exige emuladores novos. Exporta/criptografa/restaura dados fictícios e valida tipos, Auth, relatórios, Excel e duplicidade anterior ao backup. Detalhes e duração em BACKUP-RESTORE.md.

`node scripts/smoke-product.cjs` verifica as páginas, sete guias, favicon, robots/sitemap e imagem Open Graph em servidor loopback. `SMOKE_INSTITUTIONAL=true` verifica também bloqueio das rotas de aplicação/API. Não apontar esses smokes para uma instalação real para criar dados.

A revisão visual manual cobre cinco larguras, temas, títulos/semântica, contraste de amostras, teclado e FAQ. É revisão básica, sem declaração de certificação integral WCAG nem suíte visual automática.
