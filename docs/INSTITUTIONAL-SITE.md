# Site institucional — arquitetura e implementação

Versão local implementada, sem domínio, publicação ou preços definidos.

| Seção | Conteúdo confirmado |
| --- | --- |
| Home | Avaliações de lideranças e colegas, instalação dedicada por empresa |
| Funcionalidades | Ciclos, critérios, setor, anonimato, relatórios, Excel, planos e controle RH/ADMIN |
| Como funciona | Cadastrar pessoas e setores, abrir ciclo, participar por matrícula e consultar resultados protegidos |
| Demonstração | Ambiente separado com pessoas e dados fictícios; não usar Firebase da Atalaia |
| Edições | Community/Pro/Cloud como propostas, sem assinatura disponível |
| Documentação | Instalação, segurança, operação e recuperação |
| FAQ | Internet/Firebase, anonimato, mínimo de respostas, duplicidade e equipamentos |
| Contato | Canal comercial a definir pelo proprietário; não inventar endereço |
| Login | Endereço da instalação de cada empresa; não criar login Cloud nesta fase |

`avaliagestao.com.br` é o nome desejado, sem verificação de disponibilidade ou registro. Identidade do produto deve ser separada da marca Atalaia antes da distribuição. Não divulgar clientes, números de resultado, depoimentos, preços ou garantias ainda não comprovados.

O site possui modo institucional independente, guias públicos e demonstração fictícia de leitura. Publicação depende de release, domínio, licença e canal de contato.

## Implementação local — etapa 3

Páginas: /produto, /produto/edicoes, /produto/demonstracao, /produto/contato, /produto/documentacao e sete guias por slug. Home contém recursos, fluxo, privacidade, segurança, edições e FAQ. Demonstração somente de leitura com empresa/pessoas fictícias, sem conexão ao Firebase.

Identidade central em src/lib/product.ts; Inter, laranja com contraste suficiente e neutros, mesmos temas/bordas/raios da aplicação. Marca da instalação permanece independente, com opção generic por configuração de build. Nenhuma entidade jurídica ou endereço inventado.

Configuração server-side PRODUCT_SITE_URL, PRODUCT_REPOSITORY_URL, PRODUCT_APPLICATION_URL, PRODUCT_DOCUMENTATION_URL e PRODUCT_SUPPORT_EMAIL. Links ausentes não são fabricados. Contato abre e-mail somente se um canal real for configurado; não existe coleta silenciosa ou envio simulado de leads.

SEO: títulos/descrições, canonical condicionado a URL configurada, Open Graph PNG, favicon SVG, robots e sitemap. Indexação desligada por padrão; somente páginas do produto podem ser liberadas. Aplicação interna conserva noindex.

## Arquitetura de publicação futura

- avaliagestao.com.br: instalação independente em SITE_MODE=institutional, raiz apresenta a Home. Rotas administrativas/avaliações/APIs ficam bloqueadas; /api/health permanece para liveness. Não usar credenciais ou banco da empresa nessa instalação.
- app.avaliagestao.com.br: aplicação futura; não existe SaaS nem cadastro multiempresa nesta etapa. Instalações dedicadas mantêm destinos próprios.
- docs.avaliagestao.com.br: publicar os guias genéricos de docs/public por um gerador/host aprovado, ou roteamento independente para as páginas públicas. Não encaminhar operações privadas.

Os nomes são intenção arquitetural, sem compra, verificação de disponibilidade, DNS ou exposição de rede. A versão atual é acessível apenas localmente/internamente para validação.
