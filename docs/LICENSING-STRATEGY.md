# Licenciamento aprovado — revisão focada de source release

## Declaração e escopo

Decisões do proprietário recebidas em 06/10/2026: autor Kaynan Fernandes, titular informado Kaynan (pessoa física), desenvolvimento com auxílio do ChatGPT Work como ferramenta, sem conhecimento de cópias/adaptações manuais além dos terceiros inventariados; uso/comercialização do nome Avalia Gestão autorizados. Registro da declaração, não parecer jurídico.

Copyright 2026 Kaynan cobre esta edição. Não inventamos sobrenome do titular, CPF, endereço, empresa ou anos anteriores. O nome completo fornecido para o modelo CLA é Kaynan Fernandes; identidade/forma contratual indispensável serão confirmadas privadamente para acordos definitivos. Não há informação adicional indispensável identificada para a licença Community.

## Escolha: AGPL-3.0-only

| Opção | Vantagem | Custo para a estratégia |
| --- | --- | --- |
| only | Versão 3 explícita; mudanças futuras dependem dos titulares/autorização das contribuições | Menor flexibilidade automática com futuras versões da licença |
| or-later | Destinatários podem escolher versão futura publicada pela FSF; pode facilitar compatibilidade futura | O titular não controla a opção futura já concedida aos destinatários |

Escolha autorizada por discricionariedade do proprietário: **AGPL-3.0-only**. Community, self-hosting e uso comercial continuam permitidos conforme AGPL. Dual licensing não depende de proibir uso comercial Community: exige direitos próprios e autorização adequada sobre contribuições externas. O proprietário pode oferecer termos separados para material cujos direitos detenha; não retirar concessões AGPL de cópias já recebidas.

Não se trata de impedir concorrência/SaaS. O texto da seção 13 exige oferta de fonte correspondente para versões modificadas acessíveis por rede. Oferecer a fonte efetivamente instalada por acesso real e preservar avisos; não há repositório remoto inventado nesta etapa.

Fontes: [texto AGPL/SPDX](https://spdx.org/licenses/AGPL-3.0-only.html), [FSF FAQ](https://www.gnu.org/licenses/gpl-faq.en.html) e [FSF contributor FAQ](https://www.fsf.org/licensing/contributor-faq). LICENSE conserva integralmente o texto da licença; apenas a concessão do projeto especifica only.

## Revisão de compatibilidade antes da concessão

Revisão focada sobre o grafo já inventariado de 487 entradas, sem novo levantamento geral. Nenhuma versão/cadeia de dependência foi alterada; somente metadata de licença do projeto muda o hash do lockfile. UNKNOWN em metadado de limiter 1.1.5 já possui evidência MIT. Nenhum impedimento conhecido foi identificado para o formato de distribuição fonte escolhido.

| Componentes/termos | Tratamento |
| --- | --- |
| MIT, ISC, BSD, 0BSD, BlueOak, Apache-2.0 | Preservar copyrights, termos e NOTICE disponíveis. Não substituir por AGPL |
| pako MIT AND Zlib; victory-vendor MIT AND ISC | Preservar os avisos cumulativos/subcomponentes |
| jszip MIT OR GPL-3.0-or-later | Usar alternativa MIT concedida pelo upstream; texto upstream integral permanece |
| type-fest MIT OR CC0-1.0 | Alternativa declarada e texto original preservados; sem atribuir novo copyright |
| caniuse-lite CC-BY-4.0 | Atribuição/licença dos dados separadas; manter avisos e indicar alterações quando houver |
| Inter SIL OFL; Lucide/Feather ISC | Fonte/ícones independentes mantêm copyright/termos; sem novo cabeçalho Kaynan |
| sharp/libvips LGPL/Apache, Cairo MPL, Debian GPL/LGPL | Executáveis/SO não acompanham o pacote fonte. Receitas/notices originais preservados; distribuição binária continua BLOCKED conforme revisão final |
| Firebase/Google Cloud serviços | Termos do serviço separados; AGPL do projeto não licencia Firebase |

A [lista FSF](https://www.gnu.org/licenses/license-list.es.html) confirma compatibilidade Apache 2 com GPL v3; isso não dispensa notices. Demais permissivas conservam suas concessões. Nenhuma biblioteca, receita, fonte ou aviso de terceiro recebe copyright do projeto por este registro. Não foi emitida certificação jurídica geral de compatibilidade ou de contrato comercial.

## Arquivos próprios e terceiros

- Próprios: src (exceto material com aviso upstream identificado), scripts/testes do projeto, configurações de build/CI e documentação própria; root LICENSE/COPYRIGHT/README/políticas declaram o escopo.
- Terceiros: docs/third-party inteiro, arquivos originais e receitas upstream; textos agregados de terceiros em public/legal; dependências obtidas por npm; fontes/ícones/notices segundo inventários. Preservar licenças originais.
- LICENSE é documento FSF original; COPYRIGHT é concessão própria separada. public/legal/LICENSE.txt e COPYRIGHT.txt são acompanhamento próprio, não alteração de THIRD-PARTY-NOTICES.txt.
- Excluídos: assets Atalaia, .env reais, dados, exports/backups, .private, node_modules, .next/standalone, imagens Docker/cartão e histórico Git original. Snapshot público tem um commit local e nenhum remote.

Aplicados LICENSE, COPYRIGHT, AUTHORS.md, package.json/license e metadata root do lockfile/SBOM; README, CONTRIBUTING, SECURITY, notices e políticas ajustados. Não foram adicionados cabeçalhos em arquivos de terceiros nem retirada de avisos. Inventários podem ser regenerados sem voltar a dizer licença PENDING.

## Contribuições e alternativa comercial

Recomendação: **CLA não exclusivo com autorização expressa de sublicenciamento/relicenciamento**, com direitos retidos pelo contribuidor, mais DCO opcional de proveniência. Cessão exclusiva centraliza direitos, mas aumenta custo/atrito e não foi escolhida. Uma declaração AGPL inbound simples não autoriza automaticamente a alternativa comercial.

[DCO](https://developercertificate.org/) registra direito de enviar a contribuição sob a licença indicada e entendimento sobre registro público; sozinho não concede ao titular direitos comerciais adicionais. CLA precisa explicitar essa finalidade. Um grant amplo sem clareza pode afastar contributors; ser transparente sobre a opção comercial e manter Community funcional.

CLA.md é modelo em revisão, não contrato em vigor. Bloquear merges externos até aprovação do acordo definitivo e aceite verificável. Isso não bloqueia publicar o código próprio atual nem receber bugs/discussões. COMMERCIAL-LICENSE.md explica arquitetura comercial sem contrato/preços/SLA; revisão do instrumento comercial ocorrerá quando efetivamente oferecido.
