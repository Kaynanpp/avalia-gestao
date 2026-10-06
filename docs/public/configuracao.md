# Configuração e segurança

Separe configuração pública de credenciais do servidor.

## Procedimento

1. Mantenha as credenciais administrativas Firebase exclusivamente no servidor, com acesso restrito. Arquivos .env não entram no Git, nos backups públicos ou em imagens de distribuição.

2. Gere PARTICIPATION_SECRET com pelo menos 32 caracteres aleatórios e mantenha-o estável. Ele protege os identificadores de participação e não deve ser exposto ao navegador.

3. Use o endereço correto da instalação. Em rede privada, configure porta e IP reservado conforme a infraestrutura da empresa.

4. Em produção externa, configure HTTPS e um proxy que substitua os cabeçalhos encaminhados. TRUST_PROXY só pode ser true quando esse proxy for confiável.

5. Valide limites de tentativas para o volume de usuários e a rede compartilhada. IP não é a garantia de participação única.

6. Revise contas ativas, permissões e responsáveis pela recuperação regularmente.

## Comandos de referência

```sh
npm run config:check
```

## Antes de prosseguir

A rotação de segredos de participação exige ciclos encerrados, janela sem gravações e chaves anteriores preservadas conforme o procedimento operacional.
