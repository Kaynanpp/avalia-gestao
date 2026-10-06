# Inventário e classificação das APIs

Classificação em 05/10/2026. Todas as mutações passam pelo middleware de mesma origem e recebem um identificador de requisição.

## Públicas e operacionais

| Rota | Método | Classe | Proteção principal |
| --- | --- | --- | --- |
| `/api/health` | GET | Liveness | Sem dados internos |
| `/api/ready` | GET | Readiness sensível | Resposta mínima; Firestore e configuração |
| `/api/admin/login` | POST | Pública sensível | Payload, rate limit persistente, Firebase Auth |
| `/api/admin/logout` | POST | Sessão | Mesma origem; remove cookie |
| `/api/avaliacoes/acesso` | POST | Pública sensível | Matrícula, rate limit e elegibilidade no servidor |
| `/api/avaliacoes` | POST | Pública sensível | Token HMAC, rate limit, transação e unicidade |
| `/api/avaliacoes-colegas/acesso` | POST | Pública sensível | Matrícula, rate limit e setor no servidor |
| `/api/avaliacoes-colegas` | POST | Pública sensível | Token HMAC, rate limit, transação e unicidade |
| `/api/colegas` | POST | Pública legada | Convite assinado, validação e transação |
| `/api/autoavaliacoes` | POST | Encerrada | Retorna 410 e preserva histórico |

## RH ou ADMIN

- Lideranças: `/api/gerentes`, `/api/gerentes/[id]` e aliases `/api/liderancas`.
- Setores: `/api/setores` e `/api/setores/[id]`.
- Períodos: `/api/periodos` e `/api/periodos/[id]`.
- Leitura de critérios: `GET /api/criterios`.
- Planos: `/api/admin/planos` e `/api/admin/planos/[id]`.
- Colaboradores: `/api/admin/colegas`, `.../[id]`, `.../importar`, `.../modelo`, `.../links`, `.../participacao` e `.../relatorio`.
- Comentários e exportação: `/api/admin/comentarios` e `/api/admin/relatorios/export`.

Essas rotas verificam a sessão no servidor. O papel RH não recebe as operações reservadas ao ADMIN.

## Somente ADMIN

- Configuração: `/api/configuracoes`.
- Criação, ordenação e alteração de critérios: mutações em `/api/criterios` e `/api/criterios/[id]`.
- Contas: `/api/admin/usuarios`, `/api/admin/usuarios/[id]` e `/api/admin/usuarios/[id]/senha`.

## Conta autenticada

- `POST /api/admin/conta/senha`: permite a troca obrigatória da própria senha, exige token recente do mesmo usuário e encerra sessões anteriores.

## Contratos que devem permanecer nos testes

1. Rotas administrativas recusam ausência de sessão com 401.
2. Operações ADMIN recusam RH com 403.
3. Payload inválido retorna 400 ou 415 sem executar a operação.
4. Falhas internas retornam mensagem genérica e um `X-Request-ID`.
5. APIs públicas nunca retornam matrícula, e-mail ou relação participante-resposta.
6. Avaliações exigem token assinado, elegibilidade e período aberto.
7. Exportações exigem RH/ADMIN e geram auditoria.
8. Readiness nunca revela credenciais, projeto ou mensagem interna.

Os testes executam os handlers reais com dependências simuladas para autenticação, autorização, payload, cookies e rate limiting concorrente. Também preservam contratos estruturais de anonimato e unicidade. A suíte HTTP com Firebase Auth/Firestore em emuladores também foi executada, e a interface foi conferida manualmente no navegador. Consulte INTEGRATION-TESTS.md para repetir o procedimento.
