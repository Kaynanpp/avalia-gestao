# Publicação de fontes Community

Repositório público: https://github.com/Kaynanpp/avalia-gestao

O histórico público começa com um snapshot genérico do candidato 1b19c85. O histórico privado original não foi enviado. A licença própria é AGPL-3.0-only; notices/copyrights upstream permanecem separados. O CLA continua rascunho; não incorporar contribuições externas antes da aprovação e aceite definitivo.

## Configuração aplicada em 06/10/2026

- Branch padrão main; Issues e Discussions habilitados.
- PR com uma aprovação, verificação `verify` obrigatória e branch atualizada para colaboradores.
- Force push e exclusão de main desabilitados; histórico linear e conversas resolvidas exigidos.
- Regras não são impostas ao administrador, permitindo manutenção pelo proprietário. Qualquer exceção administrativa deve ser consciente e documentada.
- Secret scanning e push protection habilitados pelo GitHub. Não substituem revisão prévia; não incluir dados, secrets ou configurações reais em PRs.
- Segurança privada: endereço aprovado em SECURITY.md, sem prazo/SLA prometido.

## CI e release

A primeira CI expôs uma fixture cloud que herdava NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true. O teste foi isolado com restauração do ambiente; a validação contra misturar cloud/emuladores e todas as asserções permanecem. Nenhuma proteção de produção foi reduzida.

Publicar v1.0.0-rc.2 como prerelease somente após CI verde. Disponibilizar exclusivamente fontes automáticas do GitHub, receitas e documentação. Não anexar pacote de reconstrução, backups, imagens Docker, executáveis ou imagem Raspberry. Binary/Docker permanecem bloqueados por obrigações nativas; Raspberry depende de backup externo verificado. Site institucional e Firebase de produção não são publicados/alterados nesta operação.
