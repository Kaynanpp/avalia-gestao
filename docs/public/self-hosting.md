# Operação self-hosted

Responsabilidades de quem mantém uma instalação.

## Procedimento

1. Mantenha um ambiente Firebase por empresa enquanto o isolamento multiempresa não for implementado.

2. Reserve endereço interno e defina quem cuida de sistema operacional, Docker, certificados, Firebase e atualizações.

3. Acompanhe /api/health para o processo e /api/ready para prontidão da configuração e do Firestore. A prontidão não testa todos os provedores externos.

4. Controle logs e espaço em disco; não registre matrículas, notas, comentários, senhas ou tokens nos logs.

5. Proteja as matrículas contra uso indevido. A matrícula identifica o cadastro, mas não comprova a identidade de quem a digitou.

6. Teste capacidade com dados fictícios representativos e ensaie recuperação antes de assumir disponibilidade contratual.

## Antes de prosseguir

Node.js fica dentro do contêiner. Esta versão ainda depende de Firebase e internet; não é uma solução totalmente offline.
