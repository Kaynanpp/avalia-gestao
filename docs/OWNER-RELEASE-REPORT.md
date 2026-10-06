# Decisões do proprietário — Community v1.0.0-rc.2

Data: 06/10/2026. Continuação de 47c1c62, sem nova auditoria geral, funcionalidades, Cloud ou refatorações. Candidato local; nada publicado externamente.

## Titularidade registrada

Autoria declarada: Kaynan Fernandes. Titular informado para copyright: Kaynan, pessoa física. ChatGPT Work foi ferramenta de desenvolvimento. AUTHORS.md registra a declaração do proprietário sobre autoria e ausência conhecida de cópias manuais externas além das dependências inventariadas; não é parecer jurídico. Nenhum CPF, endereço, empresa ou sobrenome do titular foi inventado.

## Licença

AGPL-3.0-only. A escolha mantém versão 3 explícita e controle sobre concessões futuras; or-later permitiria ao destinatário escolher automaticamente versões futuras da FSF. O texto original integral está em LICENSE, acompanhado por COPYRIGHT 2026 Kaynan. Metadata própria em package.json/lockfile/SBOM, documentação e cópias públicas em public/legal foram alinhadas.

Os 487 componentes do inventário mantêm o grafo anterior: nenhuma dependência foi atualizada. Não foi encontrado impedimento conhecido para a distribuição de fontes escolhida. Terceiros em docs/third-party, fontes/ícones, textos upstream agregados e dependências conservam seus copyrights/licenças. Não receberam cabeçalhos Kaynan. Assets Atalaia, dados reais, configurações privadas, executáveis, node_modules, standalone e imagens ficam fora do pacote.

COMMERCIAL-LICENSE.md descreve alternativa comercial futura e serviços, sem conceder contrato comercial automaticamente ou inventar preços/SLA. Contrato formal é documento separado sujeito a revisão antes da oferta. A licença Community permite uso comercial segundo seus termos.

## Contribuições

CLA não exclusivo com autorização expressa de relicenciamento/sublicenciamento, acompanhado de DCO opcional de proveniência. DCO sozinho não concede autorização adicional para dual licensing. CLA.md é RASCUNHO, não vigente; nenhum aceite automático por PR/checkbox. Merges externos ficam bloqueados até aprovação e aceite verificável do instrumento definitivo. Isso não bloqueia publicar o código próprio atual. Destinatário do modelo: Kaynan Fernandes, pessoa física, sem identificadores privados públicos.

## Marca

Gate 5 PASS: autorização declarada para Avalia Gestão; candidato genérico, assets Atalaia EXCLUDED. Nome/marca separados da concessão do código. Não há alegação de registro ou parecer de disponibilidade de marca.

## Segurança

Gate 8 PASS documental. Canal privado autorizado: suporteatalaiaprados@gmail.com. SECURITY.md e templates orientam não publicar vulnerabilidades em Issues, não enviar dados reais desnecessários e não testar terceiros destrutivamente. Não foi enviado e-mail nem comprovado monitoramento operacional; nenhum SLA foi prometido. Community usa Issues reproduzíveis e Discussions quando habilitado, sem promessa de suporte individual gratuito.

## Backup

**AGUARDANDO MÍDIA.** Procedimento preparado; inspeção identificou somente disco interno crítico do sistema. Proprietário informou que ainda não está com a mídia em mãos e avisará quando estiver. Nenhum dado real foi copiado. Antes da execução serão identificados mídia/destino/capacidade/permissões, cofre separado e responsáveis, criptografia e verificação de manifesto/checksums. Sem formatação, exclusão ou restauração sobre produção.

## Estados independentes

| Distribuição/operação | Estado | Condição |
| --- | --- | --- |
| Source release | PASS | Fontes licenciadas, testes/notices/snapshot verificados; manifesto final conferido na montagem |
| Binary release | BLOCKED | Fontes/condições LGPL/GPL/MPL e copyrights nativos exatos ainda pendentes |
| Docker público | BLOCKED | Mesmas obrigações de redistribuição binária; imagem só interna |
| Raspberry deploy | BLOCKED | Backup real externo não executado/verificado |

Detalhamento das obrigações binárias: FINAL-THIRD-PARTY-REVIEW.md. Gate 1/laboratório Firebase e recuperação já comprovados anteriormente preservados, sem repetir restore ou acessar dados reais.

## Validação

Windows: instalação limpa npm ci PASS, 82/82 unitários, 13/13 integração HTTP/Auth/Firestore, lint, TypeScript e build de produção PASS. Auditoria npm produção 0, completa 10 (8 high/2 moderate), riscos dev conhecidos preservados. Linux: instalação limpa no builder ARM64 PASS. Linux ARM64: 82/82 unitários, lint/TypeScript e build de produção PASS; auditoria npm produção 0, completa 10 (8 high/2 moderate) nos caminhos dev já analisados. SBOM CycloneDX 1.6 validado; grafo não-root do lockfile idêntico a 47c1c62. Lock SHA-256: 97018a1da895d23912b90420411b78c54fd0b6590c7108f0533bc5c483e7c415. Texto LICENSE SHA-256: d8a6cc31abc16b6748c7a21f21611f5a1ec33f67d22ca23d7da1c19b95496bee.

Imagem ARM64 privada: sha256:996e8c420ac948656b17add352954640ffc1c5ca2ca332e195e2046cef5384f3, 509.742.143 bytes, usuário node. Parâmetros públicos fictícios de homologação; não é imagem publicada ou produção Firebase real. Produção existente permanece healthy, imagem b7d4774056bc6ebbd934c9888fad8e33a897b53e53ee1093a02e2a3c7abc5405, sem cutover.

Auditoria completa mantém riscos dev conhecidos braces/core, sem forçar atualização major. Não confundir auditoria npm produção zero com ausência de todos os riscos nativos: avaliação anterior da base Debian/Trivy e mitigação permanecem documentadas. CI foi preparada localmente; nenhuma execução remota alegada.

## Decisões restantes

Disponibilizar mídia/cofre/custodiantes para backup antes de deploy; revisar/ativar CLA antes de futuras contribuições externas e contrato antes de licença comercial formal. Publicação de fontes será operação separada, ainda não executada. Não há dado adicional indispensável identificado para aplicar a licença Community atual.

## Recomendação final

**SOURCE READY FOR PUBLICATION**. Fontes podem ser publicadas em uma operação separada autorizada; esta execução não fez push/release remoto. Pacote genérico com manifesto/checksums, sem dados/segredos/Atalaia; SBOM validado e 1.034 hashes de notices conferidos. Os 112 caminhos de contatos upstream legítimos são preservados e o e-mail do proprietário autorizado é revisado separadamente, sem supressão global do scanner. Snapshot público local com um commit e nenhum remote; inspeção heurística de indicadores conhecidos não é garantia universal de ausência de segredos.


## Encerramento operacional

Chave SSH temporária removida; demais autorizações preservadas. Produção permaneceu healthy e com imagem idêntica. Nenhum Firebase real, backup, restore, publicação, registry ou deploy executado. Gate 1/recovery anterior preservado, sem mudanças nos algoritmos de backup; CI não executada remotamente. Primeira tentativa de npm ci Windows encontrou EBADF/EEXIST no cache global; repetição com cache isolado e instalação nova passou, sem forçar dependências. Não foram removidos testes ou asserções.
