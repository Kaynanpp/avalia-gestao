# Instalação dedicada

Um ambiente por empresa, com servidor e Firebase próprios.

## Procedimento

1. Use Linux de 64 bits com Docker Engine e Docker Compose. Raspberry Pi OS de 64 bits é uma opção; valide memória, armazenamento e conectividade para o volume esperado.

2. Disponibilize um projeto Firebase dedicado, Authentication por e-mail/senha e Firestore. O servidor precisa de internet para esses serviços.

3. Obtenha o código de uma versão aprovada. A distribuição pública e sua licença ainda não foram liberadas.

4. Copie .env.pi.example para .env.pi. Configure credenciais, segredo de participação, endereço e porta. Nunca publique esse arquivo nem use NEXT_PUBLIC_ para segredos.

5. Construa a imagem, valide a configuração e inicie o serviço. Confira /api/health e /api/ready antes de criar o primeiro administrador.

6. Antes de aceitar a instalação, valide anonimato, participação única, relatórios, backup, restauração e rollback.

## Comandos de referência

```sh
docker compose --env-file .env.pi build
docker compose --env-file .env.pi run --rm --entrypoint node app scripts/check-environment.cjs
docker compose --env-file .env.pi up -d
```

## Antes de prosseguir

Acesso pela rede interna não autoriza exposição à internet. Publicação externa precisa de proxy, HTTPS confiável, firewall e revisão operacional.
