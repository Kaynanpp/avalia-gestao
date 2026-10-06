# Estratégia de histórico público

Recomendação: **B — histórico público novo a partir de snapshot genérico seguro**, mantendo o histórico original privado. Não houve publicação, push, alteração de remote ou reescrita do repositório de trabalho.

| Critério | A: sanear histórico existente | B: snapshot novo |
| --- | --- | --- |
| Segurança | Reescrever todos os refs/objetos e revisar cópias; fácil deixar conteúdo antigo acessível | Revisar um conjunto explícito sem commits operacionais |
| Transparência | Preserva evolução com redactions explicadas | Publicar changelog e informar que é o início da distribuição pública |
| Manutenção | SHAs alterados, clones/branches precisam reconciliação | Relação com commit privado via manifesto; fluxo privado/público precisa governança |
| Risco | Reescrita pode afetar rollback e referências existentes | Não afeta histórico operacional; não garante licença ou ausência de dados por si só |
| Contribuições | Histórico completo após limpeza | Contribuições iniciam no novo root; manter provenance e política de direitos |

## Resolução dos sete itens

Todos foram introduzidos no baseline 20a6c87. A tabela interna com caminhos/commit/tipo/risco/ação fica em .private/operations/history-items-rc2.md. Não foram identificados secrets nesses sete itens: quatro são identificadores/descrições de infraestrutura e três são assets empresariais sem autorização pública comprovada.

O gerador release-artifact exclui relatórios operacionais e os três assets, inclui somente configuração atual demonstrativa/genérica e não inclui .git. Portanto o novo snapshot não leva as versões antigas de configuração nem os commits com IPs. Isso resolve a inclusão técnica dos sete itens **no pacote novo**, sem retirar ou apagar a evidência privada. Direitos do nome/código seguem pendentes, e os scanners devem ser repetidos no novo root.

## Preparação local reversível

1. Gerar e verificar um pacote a partir de commit limpo conforme DISASTER-RECOVERY.
2. Conferir manualmente arquivos, metadados, screenshots e avisos de terceiros.
3. Iniciar repositório separado dentro de .private, sem remote. Criar root commit local explicando origem/snapshot e licença pendente.
4. Executar scanners nesse novo histórico e testar instalação/build pelo pacote, sem .env.local privado.
5. Manter origem privada intacta. Não adicionar licença nem publicar antes da decisão do titular.

O root não é um release público. Um resultado limpo dos scanners é heurístico, não auditoria humana completa ou prova de titularidade. Não apague/force-push o histórico original. Publicar versão segura depende também da recuperação, das licenças e dos canais de segurança/suporte.

Preparação efetivamente executada: primeiro root local 9e177b1, sem remote, snapshot rc.2 e ambos os scanners com zero achados. A entrega final recebe novo pacote/manifesto após consolidar evidências, também restrito a .private. O histórico operacional não foi reescrito nem anexado ao root novo.
