# Histórico de alterações

## 1.0.0-rc.2 — decisões do proprietário, candidato fonte — 06/10/2026

- Código próprio licenciado AGPL-3.0-only; copyright 2026 Kaynan e autoria declarada Kaynan Fernandes.
- Avisos/licenças de terceiros preservados; assets Atalaia excluídos da distribuição pública.
- SECURITY com canal privado autorizado; Community/serviços e futura licença comercial documentados.
- CLA em revisão e política que bloqueia merges externos até acordo definitivo/aceite adequado.
- Preparação do GitHub e package metadata licenciados; nenhuma publicação, release remota ou deploy.
- Distribuição inicial somente fontes/receitas/documentação. Binários/Docker/cartão continuam sujeitos aos gates específicos.


## 1.0.0-rc.2 — candidato local, publicação bloqueada — 05/10/2026

- Matriz de recuperação Firestore/Auth/configuração/secrets e instruções para ensaio cloud autorizado; nenhum restore cloud ou deploy realizado.
- Pacote genérico de reconstrução com manifestos/checksums, exclusão de assets empresariais e histórico público novo somente local.
- Inventário de marca, licenças, SBOM CycloneDX validado e evidência de avisos na instalação Linux limpa.
- CI por SHA com privilégio de leitura e atualização semanal proposta via Dependabot.
- Instalação limpa com bootstrap real, ADMIN/RH, troca obrigatória e logout; proteção de readiness em produção com emuladores preservada.
- Políticas de backup/suporte e checklist PASS/FAIL/BLOCKED/NOT APPLICABLE; achados de ferramentas dev expostos separadamente da auditoria de produção.

## 1.0.0-rc.1 — candidato local — 05/10/2026

- Backup lógico AES-256-GCM e restauração restrita a ambiente isolado vazio; ensaio funcional com dados fictícios.
- Identidade central do produto e marca da instalação configurável.
- Site institucional responsivo, temas claro/escuro, SEO condicionado à configuração e isolamento das rotas privadas.
- Demonstração somente de leitura com dados fictícios e sete guias públicos.
- Matriz de edições, recomendação de licença pendente, design Cloud e checklist de distribuição.
- Revisão do histórico Git com bloqueios de privacidade registrados; nenhuma publicação externa.
- 57 testes unitários, 13 testes HTTP, lint, TypeScript, build Linux e 17 rotas standalone aprovados. Produção permanece no baseline.

## Em desenvolvimento — 05/10/2026

- Limitação persistente de login, identificação e operações sensíveis.
- Autenticação e confirmação de senha pelo servidor.
- Readiness do Firestore, logs estruturados e correlação de requisição.
- Documentação operacional, instalação e projeto futuro multiempresa.
- Testes HTTP com Auth e Firestore emulados: duplicidade, concorrência, anonimato, elegibilidade e limites persistentes.
- Correção do status HTTP ao exigir troca de senha e distinção entre credencial inválida e falha operacional do provedor.

## Baseline — 02/10/2026 — 20a6c87

- Participação administrativa agregada, com preservação de anonimato.
- Dependências de produção corrigidas, 23 testes e build Linux aprovado.
- Git local, CI e diagnóstico técnico.
