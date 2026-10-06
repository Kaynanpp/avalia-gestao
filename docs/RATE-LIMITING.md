# Limitação persistente de tentativas

## Objetivo

O Avalia Gestão utiliza documentos transacionais no Firestore para limitar abuso mesmo quando o processo reinicia ou quando existem várias instâncias. A proteção complementa as cotas e defesas do Firebase Authentication.

Nenhum e-mail, matrícula, token ou IP é gravado em texto legível. A chave do contador é um HMAC SHA-256 derivado de `RATE_LIMIT_SECRET` ou, quando ele não é informado, de `PARTICIPATION_SECRET` com separação de domínio.

## Escopos protegidos

| Fluxo | Chave principal | Padrão |
| --- | --- | --- |
| Login administrativo | e-mail normalizado e origem confiável | 8 por 15 min; bloqueio de 15 min |
| Identificação para avaliar liderança | matrícula normalizada e origem confiável | 10 por 15 min; bloqueio de 10 min |
| Identificação para avaliar colega | matrícula normalizada e origem confiável | 10 por 15 min; bloqueio de 10 min |
| Envio de avaliação | participante validado no token assinado | 30 por 15 min |
| Troca/redefinição de senha | ID interno do administrador | 8 por 15 min |
| Criação de usuário, importação e links | ID interno do operador | 30 por 15 min |

Os valores podem ser ajustados pelas variáveis documentadas em `.env.example`. A resposta bloqueada usa HTTP `429` e informa `Retry-After`.

## Concorrência e persistência

Cada tentativa é processada dentro de uma transação do Firestore. Requisições simultâneas sobre o mesmo contador são serializadas pelo banco. Os documentos ficam em `securityRateLimits` e possuem apenas escopo, contagem, datas e `expiresAt`.

`firestore.indexes.json` define `expiresAt` como TTL e desativa seu índice comum. Depois de aplicar essa configuração com `firebase deploy --only firestore:indexes`, o Firestore remove contadores vencidos de forma assíncrona. O aplicativo continua seguro antes da remoção física porque ignora janelas expiradas.

## Origem da requisição e proxy

`TRUST_PROXY=false` é o padrão. Nesse modo o aplicativo não confia em cabeçalhos enviados livremente pelo cliente. A limitação por e-mail ou matrícula continua ativa.

Defina `TRUST_PROXY=true` somente quando um proxy controlado substituir, em vez de apenas repassar, `X-Forwarded-For` e `X-Forwarded-Proto`. Nesse cenário também entra em vigor o contador por origem. A porta do aplicativo deve aceitar conexão somente do proxy ou da rede confiável.

## Login

A página envia e-mail e senha à API do próprio sistema. A API limita a tentativa antes de chamar o endpoint oficial do Firebase Authentication, cria a sessão HTTP-only e nunca devolve tokens do Firebase ao navegador. Falhas usam uma mensagem genérica para evitar enumeração de contas.

Não existe recuperação pública de senha nesta versão. A redefinição é feita por um ADMIN autenticado e também possui limite persistente.

## Operação

- Não registre os valores crus usados como chave.
- Nunca use prefixo `NEXT_PUBLIC_` em segredos.
- Mantenha o segredo estável entre reinícios e réplicas.
- Em rotação planejada, aceite que os contadores antigos se tornem inacessíveis e expirem pelo TTL.
- Monitore respostas `429`; picos contínuos podem indicar automação abusiva ou limites baixos para a operação real.

Em rede de produção com muitos funcionários compartilhando o mesmo endereço, dimensione RATE_LIMIT_SOURCE_MAX por teste de carga antes de ativar o proxy. O padrão é 60 tentativas em cinco minutos por escopo/origem. Sem proxy confiável, mudar de matrícula/e-mail contorna o limite por assunto; não trate essa modalidade como proteção completa contra enumeração. Tokens inválidos são rejeitados antes de criar contadores de envio.
