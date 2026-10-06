# Observabilidade

## Logs

Novos eventos críticos usam JSON com `timestamp`, `level`, `event` e `requestId`. Em produção, o logger não inclui mensagens arbitrárias de exceções, corpo da requisição, senha, matrícula, e-mail, token, comentário ou chave privada.

O middleware aceita um `X-Request-ID` válido ou gera um UUID, encaminha o valor para a rota e o devolve na resposta. O operador pode relacionar uma falha informada pelo usuário aos registros do contêiner:

```sh
docker compose --env-file .env.pi logs --since 30m app
```

## Endpoints

- `/api/health`: liveness. Confirma que o processo HTTP responde. Não consulta serviços externos e é usado pelo Docker.
- `/api/ready`: readiness. Confirma configuração de segurança e leitura do Firestore. Retorna 503 com corpo mínimo quando a dependência não está pronta.

O health check do Docker permanece baseado em liveness para não reiniciar o processo repetidamente durante uma indisponibilidade externa do Firebase. Um proxy ou monitor pode retirar a instância de tráfego usando readiness.

## Eventos iniciais

- `admin_login_succeeded`
- `admin_login_rejected`
- `admin_login_rate_limited`
- `admin_login_failed`
- `leadership_evaluation_submission_failed`
- `api_request_failed`
- `readiness_check_failed`

## Retenção

Na instalação dedicada, configure rotação do driver de logs do Docker no host. Não envie logs a um serviço externo sem contrato, base legal e autorização. Para suporte, compartilhe somente o intervalo necessário e revise o conteúdo antes do envio.

Readiness possui prazo de cinco segundos para a leitura. O Compose limita os logs a três arquivos de 10 MB. Os logs de falhas anteriores também foram convertidos para eventos estruturados sem mensagem arbitrária de exceção.
