# Segurança — Avalia Gestão Community

## Relato privado

Enviar relatos de vulnerabilidades exclusivamente para **suporteatalaiaprados@gmail.com**, canal inicial autorizado pelo proprietário. **Não abrir Issue, Discussion ou PR público com falha explorável, exploit, token ou dado pessoal.**

Informações úteis: versão/commit, componente/rota afetada, ambiente relevante sem secrets, impacto, comportamento esperado/observado e passos mínimos reproduzíveis com dados fictícios. Remover matrículas, avaliações, nomes de funcionários, senhas, tokens, parâmetros/hash de autenticação e configurações privadas. Não enviar dados reais desnecessários.

Não executar testes destrutivos ou não autorizados contra instalações de terceiros. Reproduzir apenas em laboratório sob autorização; não acessar respostas de outras pessoas para demonstrar a falha. Coordenar a divulgação privadamente após análise/correção. Não há prazo de resposta, cobertura de versões, garantia ou SLA definidos.

## Escopo operacional

Mantenedor informado: Kaynan Fernandes. O endereço foi disponibilizado e autorizado publicamente pelo proprietário nesta etapa: **Gate 8 PASS documental**. Não foi enviado e-mail de teste nem comprovado recebimento/monitoramento operacional; o mantenedor deve acompanhar a caixa e testar sua recuperação por procedimento próprio, sem publicar credenciais. Essa ressalva não inventa um novo bloqueio documental ou promessa de atendimento.

Community: Issues para bugs reproduzíveis; Discussions para dúvidas quando habilitado. O canal privado é para segurança, não promessa de suporte individual gratuito. Pro e Enterprise futuros exigem termos próprios; Cloud continua futuro.

## Preparação de publicação e atualizações

Publicar somente o snapshot genérico verificado de fontes/receitas, com notices e LICENSE. Não publicar histórico original privado, assets Atalaia, .env, credenciais, backups ou binários bloqueados. Inspeções heurísticas de secrets/privacidade não substituem análise de achados; copyrights upstream e o endereço autorizado acima são contatos públicos legítimos.

Use scripts/check-git-secrets.cjs e scripts/check-public-history.cjs no histórico candidato. Um alerta de contato não deve remover avisos obrigatórios. Se existir credencial real exposta, revogar; excluir o arquivo atual não limpa o histórico. Dependências e riscos dev aceitos estão em docs/SECURITY-DEPENDENCY-REVIEW.md. Nenhuma CI de PR não confiável deve receber credenciais de produção.
