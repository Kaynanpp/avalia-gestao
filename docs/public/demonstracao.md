# Demonstração e ambiente local

Experimente com dados fictícios, sem acesso à produção.

## Procedimento

1. A demonstração do site é somente leitura e não tem conexão ao Firebase. Nenhum nome, resposta ou comentário foi copiado de produção.

2. Para testar envios, use Node.js 24, Java 21 e Firebase Emulator Suite locais. Instale as dependências pelo lockfile.

3. Configure .env.local a partir de .env.example, com emuladores habilitados e projeto demo-*. Não reutilize credenciais reais.

4. Inicie Auth e Firestore em 127.0.0.1. O seed exige projeto demo-* e emuladores locais explícitos.

5. Defina uma senha local de teste em RH_SEED_PASSWORD e execute npm run seed. Esses dados não devem ser oferecidos como contas públicas.

6. Execute a suíte HTTP em emuladores novos para validar concorrência, anonimato, elegibilidade e autorização.

## Comandos de referência

```sh
npm ci
npm run emulators
# Em outro terminal, com ambiente fictício configurado:
npm run seed
npm run dev
```

## Antes de prosseguir

Nunca importe dados reais para uma demo. O futuro demo público precisa de isolamento, quotas e reset próprios antes da publicação.
