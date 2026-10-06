Direção atual aprovada: Community AGPL-3.0-only, opção comercial separada e CLA em revisão; veja [estratégia atual](LICENSING-STRATEGY.md) e [arquitetura comercial](../COMMERCIAL-LICENSE.md). Planejamento abaixo não implementa Pro/Cloud/Enterprise nem constitui contrato.

# Caminho de comercialização

## Fase 1 — instalação dedicada

Um Firebase e um servidor por empresa. Entregáveis: instalação reproduzível, administrador inicial, treinamento do RH, anonimato documentado, rate limiting, testes HTTP, backups/restauração, atualização e rollback. Aceite inclui avaliação, duplicidade, concorrência, relatórios e recuperação. Suporte e responsabilidade pelo Firebase precisam de contrato. Nenhum preço foi definido.

## Fase 2 — Community e Pro

Decidir licença e propriedade intelectual; preservar funcionalidades atuais. Publicar documentação genérica, inventário de dependências e fluxo de contribuição. Pro pode começar com implantação e suporte; só anunciar recursos avançados depois da entrega. Centralizar entitlements se forem necessários.

## Fase 3 — Cloud

Implementar o design multiempresa em ambiente isolado, testes de acesso entre tenants, jobs/caches segregados, gestão de segredos, backups por organização e observabilidade. Definir região, retenção, exportação/exclusão, operação e termos. Cobrança real entra após autorização e escolha do fornecedor.

## Fase 4 — Enterprise

SSO, provisionamento, auditoria exportável, retenção configurável, implantação privada, SLA e processos de incidente conforme demanda comprovada. Evitar customizações que fragilizem o núcleo ou o anonimato.

## Site institucional

Após aceite dos controles operacionais, criar Home, Funcionalidades, Como funciona, Demonstração, Edições, Documentação, FAQ, Contato e Login. `avaliagestao.com.br` é o domínio pretendido, sem DNS ou compra nesta etapa. Demonstração terá dados fictícios isolados. Não anunciar clientes, resultados, preços ou recursos não confirmados.

## Marco concreto da etapa 3

O site foi implementado localmente, com disponibilidade explícita. A demo é somente leitura e os guias compartilham a fonte com a documentação pública. Links de contato, GitHub e instalação só aparecem quando configurados pelo proprietário.

| Etapa | Entrega e aceite | Receita possível | Antes de oferecer |
| --- | --- | --- | --- |
| Dedicated | Ambiente por empresa, cadastro inicial, treinamento e transferência operacional | Implantação, configuração, treinamento, suporte e customização acordada | Recuperação real, backup, rollback, responsável e escopo de suporte |
| Community + Pro | Distribuição reproduzível e núcleo completo; Pro com serviços definidos | Serviços e futuros módulos implementados | Licença, histórico público, titularidade e política de contribuição |
| Cloud | Operação gerenciada e isolamento multiempresa comprovado | Assinatura futura, sem cobrança implementada | Testes entre tenants, monitoramento, retenção, exportação e contratos |
| Enterprise | Descoberta técnica e contrato com critérios de aceite próprios | Implantação, integrações, treinamento e SLA negociados | Capacidade comprovada e operação compatível |

Próximo piloto dedicado: registrar volume de pessoas/setores, executar ciclo fictício representativo, medir consultas/exportações, testar recuperação e obter aceite funcional do RH. Proposta deve explicar dependência/custos do Firebase, limites de anonimato e tarefas de cada parte. Nenhum preço, cliente, depoimento ou SLA foi inventado.
