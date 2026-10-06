# Política operacional de backups — proposta

Não ativada; não contratou armazenamento nem export gerenciado pago. Recuperação real comprovada no Gate 1 com 36 documentos/quatro contas sintéticas; RTO observado 31 min 8 s não é SLA. Tamanho/custódia do cliente ainda não medidos/comprovados. Não dimensionar por esse fixture.

| Cópia | Frequência proposta | Retenção proposta | Verificação |
| --- | --- | --- | --- |
| Firestore + Auth coerentes | Diária e antes de deploy/mudança crítica | 7 diárias, 4 semanais, 12 mensais | Integridade, contagens e confirmação da conclusão |
| Configuração e secrets | Após mudança | Atual e duas anteriores necessárias ao rollback | Recuperação do cofre por responsável substituto |
| Código/imagem | Cada release | Ativa e duas anteriores | Build e boot isolado |
| Ensaio de recuperação | Trimestral e antes de mudança de alto risco | Evidência de status/tempo sem dados pessoais | Login, autorização, UID, duplicidade e export |

Retenção é proposta sujeita à política de dados/contratos. Cópia mensal é promoção de snapshot concluído, não mistura de exports. Não excluir versões automaticamente sem aprovação da retenção. Backup antigo com segredos HMAC deve ter os mesmos controles que os dados.

Usar AES-256-GCM, chave externa independente e no mínimo uma cópia fora do servidor e de seu cartão, sob controle da empresa. Disco externo no mesmo local é melhor que um único cartão, mas não cobre perda física conjunta. Selecionar destino aprovado antes de agendar; .private não é cofre nem backup.

O executor lê serviço com menor privilégio necessário, registra apenas início/fim/status/duração/contagens, alerta falha por canal aprovado e não expõe hashes. A captura lógica exige pausa de gravações para coerência; decidir janela e medir duração real. O export gerenciado exige orçamento/bucket e proteção Auth separada. Não armazenar JSON Auth em texto puro após transporte temporário protegido.

Dimensionamento: medir tamanho criptografado e duração em snapshot aprovado; estimar retenção pelas cópias diárias/semanais/mensais, crescimento observado e espaço de reconstrução temporário. Confirmar custo de leituras, storage e restore antes de automatizar. O número de funcionários sozinho não determina o tamanho das avaliações/ciclos.

RPO alvo proposto: até 24 horas somente com execução diária concluída e monitorada. RPO atual: sem limite garantido. RTO: obter em ensaio operacional completo. Não prometer SLA a partir de build ou fixture.

Decisões do responsável: destino/custódia, retenção aprovada, operador/substituto, janela de pausa, orçamento/quota e canal de alerta. Nenhum desses serviços foi configurado automaticamente.

## Preparação prática para a instalação atual

O responsável autorizou mídia externa criptografada e chave em cofre separado, delegando escolha. Proposta: mídia removível exclusiva da empresa com pasta AvaliaGestao-Backups, sob guarda do responsável; chave em cofre/gerenciador de senhas separado, com substituto e recuperação testados. Só foram identificados disco local e compartilhamento de scanners, não a mídia/cofre requeridos. **Backup de produção BLOCKED por disponibilidade/custódia**, sem copiar dados reais para laboratório ou compartilhamento comum. Ver [checklist de execução e custódia](PRODUCTION-CUSTODY-CHECKLIST.md).

Após disponibilização, primeiro snapshot manual na janela sem gravações; medição de bytes/duração e quota efetiva antes de agendar. Leituras lógicas normais também consomem quota, mesmo sem bucket. Não presumir custo zero fora dos limites do plano; não habilitar faturamento/serviço pago. Evidência registra só contagens, digests, status e tempo; abrir/decriptar/validar todos os manifestos em memória, sem imprimir hashes/senhas/dados.

Dimensionamento para mais de 500 pessoas: contar documentos e bytes do banco autorizado, separando ciclos/histórico. Liderança: máximo soma de colaboradores elegíveis × lideranças elegíveis por setor por ciclo, cada resposta acompanhada de controle de participação. Colegas: limite teórico por setor N × (N−1), também com controle separado; não assumir que todos avaliarão todos. Comentários e número de critérios mudam o tamanho. Só a matrícula ou número de funcionários não estima o volume do backup.

Se snapshot tiver S bytes, retenção 7+4+12 representa até 23S por conjunto; promoção da mesma cópia pode reduzir duplicação. Para dois destinos independentes, reservar aproximadamente 46S, mais folga para crescimento, criptografia e recuperação temporária. Fórmula de planejamento, sem inventar o S do cliente. Conferir espaço de destino e crescimento a cada ciclo.

Escolha de frequência: diária após expediente e imediatamente antes de deploy/alteração crítica; se volume exigir perder menos de um dia, rever frequência/quota/janela com o responsável. Retenção: 7 diárias, 4 semanais, 12 mensais, sujeita à política de dados aprovada; sem exclusão automática ativada. Manter uma cópia física fora do prédio/ponto de falha principal; a chave não acompanha a mídia. Custodiante e substituto conferem recuperação do cofre e leitura da mídia.

Verificação a cada execução: captura concluída/coerente, AES-GCM, digests e contagens, checksum em registro confiável, leitura da cópia externa. Revisão mensal de espaço/acesso/retenção e restore trimestral isolado; repetir antes de mudança de alto risco quando o teste anterior não cobrir a mudança. Gate 1 não será refeito sem necessidade. Nunca restore sobre produção para testar. Alertas somente pelo canal escolhido, nenhuma automação contratada/criada nesta etapa.


## Fechamento — preparação técnica versus operação real

**Software pronto para backup: PASS**, no escopo demonstrado por emuladores e Gate 1 real: email/senha, UID, claims, Firestore e segredo HMAC preservado em custódia separada. Nenhuma alteração de backup nesta rodada; ensaio real não repetido. MFA e provedores não cobertos exigem procedimento próprio antes de usá-los. A captura é lógica, mantém arrays em memória e requer janela sem escritores; conferir memória e quota para o tamanho real antes da execução.

**Backup real de produção: BLOCKED operacional**, por falta de mídia/destino/cofre disponibilizados, não por defeito demonstrado do software.

O responsável precisa fornecer:

- Mídia exclusiva da empresa conectada ao Windows e caminho absoluto identificado; escolher pasta AvaliaGestao-Backups. NTFS recomendado para arquivos maiores que 4 GiB e ACL. FAT32 não é adequado; exFAT não fornece ACL equivalente. Não formatar mídia existente sem autorização específica.
- Capacidade: selecionar inicialmente mídia de pelo menos 32 GiB, mas somente aprovar quando espaço livre >= 2 × (23 × S + I + C), onde S é o snapshot criptografado estimado, I imagens/configuração de reconstrução e C espaço temporário. Os 32 GiB são piso de aquisição, não garantia de suficiência; não há tamanho real medido do cliente. Não executar backup apenas para estimar S antes de haver destino protegido.
- Arquivo AES-256-GCM, chave aleatória de 32 bytes gerada localmente no momento autorizado; não pedir chave no chat, não colocá-la no arquivo/mídia de backup nem Git.
- Cofre separado da mídia/servidor, recuperável pelo responsável e substituto. Fornecer apenas nome/local e responsáveis; nenhuma senha/chave pelo chat. Não foi criado cofre ou contrato.
- ACL NTFS restrita ao operador/custodiante e SYSTEM; acesso de terceiros recusado; mídia sob guarda física com cópia independente fora do ponto de falha.
- Responsável e substituto, janela de pausa de todos os escritores, retenção aprovada de 7 diárias/4 semanais/12 mensais, revisão mensal e restore trimestral isolado.

Sequência preparada: conferir destino/ACL/espaço/cofre/quota; pausar somente escritores da aplicação na janela; exportar criptografado com projeto explicitamente confirmado; verificar AES-GCM/contagens/digests em memória sem imprimir dados; copiar/verificar mídia; conferir custódia da chave; retomar; registrar apenas status/tempo/contagens. Rollback de imagem não desfaz escritas no banco. Nunca restaurar sobre produção para testar.

## Disponibilidade nesta etapa do proprietário

Inspeção somente leitura do Windows: somente disco interno SATA, boot/sistema, volume C NTFS. Não há mídia externa inequívoca autorizada/disponível. O proprietário confirmou que ainda não está com a mídia e avisará quando a disponibilizar. Estado: **AGUARDANDO MÍDIA**. Nenhum dado real copiado, arquivo criado em mídia, formatação ou backup de produção executado.

Quando disponível: conectar mídia externa, informar letra/pasta e custodiante; identificar volume/disco e confirmar que não é crítico; conferir espaço/fórmula e ACL; identificar cofre separado/recuperação da chave; confirmar criptografia e verificação na janela de gravações pausadas. Não solicitar senha/chave pelo chat. Deploy permanece operação futura separada, sem restore sobre produção.
