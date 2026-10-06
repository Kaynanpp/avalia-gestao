# Contribuir com Avalia Gestão Community

## Licença e direitos

Código próprio: AGPL-3.0-only; dependências e avisos upstream mantêm suas licenças. O objetivo é aceitar contribuições externas futuramente e preservar a opção comercial do titular.

**CLA.md é rascunho em revisão, não está em vigor.** Não incorporar contribuições externas de código/documentação/assets até aprovar o acordo definitivo e verificar o aceite adequado. Abrir PR ou marcar checkbox não concede automaticamente direitos comerciais. Contributors conservam copyright; o futuro acordo deverá autorizar expressamente sublicenciamento/relicenciamento, conforme docs/LICENSING-STRATEGY.md.

DCO pode registrar proveniência pelo Signed-off-by depois de definido o processo, mas **DCO sozinho não concede a autorização comercial alternativa**. Não solicitar CPF, endereço ou documentos pessoais no repositório público. O mantenedor verificará privadamente os direitos e guardará a prova de aceite antes do merge. Dependências/copias externas precisam de origem/licença/avisos identificados.

## Processo

1. Para bugs, abrir Issue com versão, passos reproduzíveis e dados fictícios. Não divulgar vulnerabilidades; seguir SECURITY.md.
2. Discutir mudanças relevantes antes da implementação. Não há promessa de merge ou suporte individual.
3. Após ativar o CLA definitivo, trabalhar em branch com commits pequenos, por exemplo `fix: impedir replay de avaliação` ou `docs: esclarecer instalação`. Descrever motivo, comportamento e validações.
4. PR: preencher template, preservar anonimato, unicidade, autorização e migrações não destrutivas. Comprovar licença/proveniência e status do CLA quando aplicável.
5. Mantenedor confere direitos, CI, testes e revisão antes do merge. PRs externos executam somente emuladores/dados fictícios, sem secrets ou credenciais de produção.

## Ambiente e testes

Node.js 24, npm conforme packageManager, Java 21 para emuladores e Git para o teste de empacotamento. Usar `npm ci` e o lockfile versionado. Nunca copiar .env, exports, chaves, matrícula, nota ou comentário real para commits, Issues ou logs.

```sh
npm test
npm run lint
npm run typecheck
npx firebase emulators:exec --config firebase.recovery.json --only auth,firestore --project demo-avalia-gestao "npm run test:integration"
# Recuperação quando afetada, em emuladores novos:
npx firebase emulators:exec --config firebase.recovery.json --only auth,firestore --project demo-avalia-gestao "npm run test:recovery"
# Build após testes dev, que reconstroem .next:
npm run build
npm audit --omit=dev
npm audit
```

Não reduzir cobertura ou esconder avisos para fazer CI passar. Dois riscos de ferramentas dev têm aceite limitado em docs/SECURITY-DEPENDENCY-REVIEW.md; alterações nessa cadeia exigem rever o aceite. Não executar migração/restore/testes destrutivos em produção.

Guias públicos: editar src/content/public-guides.json e regenerar com npm run docs:public. Manter marca da instalação separada do produto, notices upstream intactos e avisos de modificação relevantes. CI remoto só existirá após publicação autorizada; sucesso local não é execução GitHub Actions.
