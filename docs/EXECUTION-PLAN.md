# Plano de execução priorizado

## P0 — Bloqueadores

- [x] Remover da interface e da API administrativa a relação individual entre avaliador e colega avaliado.
- [x] Parar de gravar hashes desnecessários dos alvos em novos documentos de participação.
- [x] Atualizar dependências transitivas vulneráveis sem mudança de versão principal.
- [x] Criar testes de integração para autenticação, RBAC, anonimato e isolamento das rotas.
- [x] Implementar rate limiting persistente para login e identificação por matrícula, sem usar IP como controle de unicidade da avaliação.

## P1 — Produção

- [x] Exigir `PARTICIPATION_SECRET` dedicado em produção com procedimento de rotação compatível.
- [ ] Configurar HTTPS confiável e proxy reverso para publicação externa.
- [x] Expandir `/api/health` com verificação segura e separada de prontidão do Firestore.
- [ ] Automatizar backup do Firestore, retenção e teste de restauração.
- [ ] Versionar índices do Firestore e validar consultas em ambiente limpo.
- [ ] Adicionar logs estruturados, correlação de requisição e monitoramento de falhas.
- [ ] Criar testes de navegador para os fluxos essenciais em celular e desktop.
- [x] Publicar runbook de deploy e rollback.

## P2 — Produto

- [ ] Paginar no banco lideranças, colaboradores, auditoria e relatórios maiores.
- [ ] Consolidar respostas e erros das APIs em uma abstração comum.
- [ ] Melhorar desempenho da tela de login e dos maiores bundles administrativos.
- [ ] Criar estados de erro, vazio e carregamento consistentes em todas as páginas.
- [ ] Revisar acessibilidade por teclado, contraste e leitores de tela.
- [ ] Revisar o acompanhamento de participação para evitar inferências em grupos pequenos.

## P3 — Comercialização

- [x] Definir o modelo de organização/tenant e um plano de migração sem perda de dados.
- [ ] Implementar isolamento de tenant no servidor, consultas, relatórios e testes.
- [ ] Criar camada central de planos, limites, feature flags e entitlements.
- [ ] Preparar Community, Pro, Cloud e Enterprise sem condicionais espalhadas.
- [ ] Criar documentação de arquitetura, deploy, privacidade, backup e API.
- [x] Produzir estratégia de licenciamento para decisão do proprietário.
- [x] Preparar repositório público/privado, templates e política de segurança.
- [x] Construir site institucional somente com funcionalidades confirmadas.
- [x] Preparar demonstração com organização e dados totalmente fictícios.

## P4 — Evolução

- [ ] Avaliar banco e arquitetura para volumes acima dos limites atuais.
- [ ] Planejar migração de ESLint 8, Recharts 2 e versões principais do frontend.
- [ ] Adicionar exportação e exclusão orientadas à política de privacidade/LGPD.
- [ ] Integrar métricas operacionais, alertas e objetivos de disponibilidade.
- [ ] Avaliar integrações corporativas, SSO e provisionamento automatizado.

## Decisões que dependem do proprietário

- Licença definitiva e divisão de recursos Community/Pro/Cloud.
- Domínio, DNS e publicação pública.
- Fornecedor de hospedagem, observabilidade e cobrança.
- Preços, limites comerciais e termos jurídicos.


## Avanço em 05/10/2026

57 testes unitários, 13 testes HTTP, build Linux e smoke de 17 rotas aprovados. Restauração fictícia criptografada ensaiada em emuladores isolados; recuperação Firebase/SCRYPT real e ativação de backup continuam necessárias. Site institucional, documentação pública e demonstração fictícia implementados. Logs estruturados e correlação implementados; alertas automáticos ainda pendentes. Arquitetura multiempresa documentada; implementação e migração não executadas. Edições comerciais permanecem propostas.
