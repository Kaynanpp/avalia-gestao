# Atualização e rollback

Troque a versão com backup e retorno preparados.

## Procedimento

1. Registre a versão implantada e o commit candidato. Confira as notas de alteração e os testes.

2. Gere backup consistente dos dados, exporte contas Authentication e preserve configuração, segredos, código e imagem anterior.

3. Restaure um backup em ambiente isolado e confirme que as contas, relações, participações e respostas podem ser recuperadas.

4. Construa a nova imagem sem substituir a anterior. Valide em homologação antes do corte.

5. Após a atualização, teste saúde, prontidão, login/logout, troca de senha, administração, avaliação, relatórios, exportação e limites de tentativas.

6. Se um fluxo crítico regredir, volte à imagem anterior preservando a configuração. Mudanças de dados exigem um procedimento próprio compatível com retorno.

## Antes de prosseguir

Um contêiner saudável não prova que todos os fluxos funcionam. Não execute limpeza de dados ou migrations junto de uma atualização comum.
