# Documentação pública e privada

`docs/public/` é gerado de `src/content/public-guides.json`, a mesma fonte do site, por `npm run docs:public`. Trata instalação, primeiros passos, configuração, atualização, backup, self-hosting e demo sem endereços ou contas reais.

Documentos técnicos genéricos em `docs/` explicam arquitetura, controles, decisões e limites. `WORKLOG.md` público deve registrar evidências agregadas, sem credenciais ou endereços da infraestrutura privada.

Operações específicas, IPs, contas, inventários, configurações e cópias antigas de documentos ficam em `.private/operations/`, ignorado por Git e Docker. Backups criptografados ficam em cofre externo aprovado; `.private/` sozinha não é um mecanismo de backup ou criptografia.

Na etapa 3, cópias dos documentos operacionais anteriores foram preservadas localmente fora do Git e o endereço real foi retirado das versões atuais de WORKLOG/diagnóstico. Commits anteriores ainda contêm esse identificador. Nenhum histórico foi reescrito. A publicação segue bloqueada até limpeza aprovada ou distribuição com histórico público novo autorizado.

Antes de distribuir, revisar todos os arquivos do pacote, histórico, screenshots e assets. A marca da instalação privada não concede automaticamente direitos de redistribuição de uma marca de empresa.
