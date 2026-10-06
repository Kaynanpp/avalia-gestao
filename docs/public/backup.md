# Backup e recuperação

Banco, contas e configuração são ativos diferentes.

## Procedimento

1. Proteja Firestore, Firebase Authentication, parâmetros originais de hash, segredos, regras, índices e imagens da aplicação. A cópia do cartão do servidor não inclui o Firebase.

2. Defina frequência, retenção e responsáveis. Sem backup concluído e agendado, não existe RPO garantido.

3. O backup lógico disponível é criptografado com AES-256-GCM. Guarde a chave de 32 bytes fora do arquivo; sem ela, a recuperação não é possível.

4. Interrompa gravações durante a captura lógica para consistência entre documentos e contas. Leituras de produção seguem as quotas e cobranças existentes do Firebase.

5. Ensaie a restauração somente em destino isolado. O script lógico recusa restaurar sobre produção ou sobre emuladores ocupados.

6. O ensaio fictício validou login, documentos, relatórios, Excel e participação única. Senhas SCRYPT reais ainda precisam de ensaio autorizado em um Firebase separado.

## Antes de prosseguir

Os tempos do ensaio pequeno não são SLA. O export gerenciado exige faturamento e bucket; não está ativado automaticamente.
