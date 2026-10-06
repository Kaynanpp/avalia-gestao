import packageInfo from '../../package.json';

/** Product identity; deployment-specific company branding remains separate. */
export const PRODUCT = {
  name: 'Avalia Gestão',
  description: 'Avaliações de lideranças e colegas, com participação por setor e resultados protegidos para o RH.',
  version: packageInfo.version,
  releaseTarget: packageInfo.version,
  copyright: 'Kaynan',
  paths: { home: '/produto', demo: '/produto/demonstracao', docs: '/produto/documentacao', editions: '/produto/edicoes', contact: '/produto/contato' },
} as const;

export const COMPANY_BRAND = {
  generic: process.env.NEXT_PUBLIC_COMPANY_BRAND !== 'atalaia',
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || (process.env.NEXT_PUBLIC_COMPANY_BRAND !== 'atalaia' ? 'Sua empresa' : 'Atalaia Alimentos'),
} as const;

export function validatedPublicUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return undefined;
    return url.href.replace(/\/$/, '');
  } catch { return undefined; }
}

// Server runtime variables. No placeholder domain is advertised as registered.
export function productPublication() {
  const siteUrl = validatedPublicUrl(process.env.PRODUCT_SITE_URL);
  const supportEmail = process.env.PRODUCT_SUPPORT_EMAIL;
  return {
    siteUrl,
    indexable: Boolean(siteUrl && process.env.PRODUCT_INDEXING_ENABLED === 'true'),
    repositoryUrl: validatedPublicUrl(process.env.PRODUCT_REPOSITORY_URL),
    applicationUrl: validatedPublicUrl(process.env.PRODUCT_APPLICATION_URL),
    docsUrl: validatedPublicUrl(process.env.PRODUCT_DOCUMENTATION_URL),
    supportEmail: supportEmail && /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(supportEmail) ? supportEmail : undefined,
  };
}

export const EDITIONS = [
  { name: 'Community', state: 'Proposta de distribuição', summary: 'O núcleo atual para instalar e operar na sua infraestrutura.', details: ['Avaliações de liderança e colegas', 'Cadastros, ciclos e critérios', 'Relatórios, Excel e planos de desenvolvimento', 'Operação e atualizações pela sua equipe'] },
  { name: 'Pro', state: 'Proposta de serviços', summary: 'A mesma base, com implantação e acompanhamento contratado.', details: ['Escopo de implantação acordado', 'Configuração e treinamento do RH', 'Suporte com condições definidas em contrato', 'Recursos futuros sujeitos a implementação'] },
  { name: 'Cloud', state: 'Planejado · indisponível', summary: 'A conveniência de uma futura operação gerenciada.', details: ['Hospedagem e atualização gerenciadas', 'Backup e recuperação operacional', 'Isolamento entre organizações a implementar', 'Sem cadastro ou assinatura disponíveis'] },
] as const;

export const FAQ = [
  ['Como os funcionários participam?', 'Durante um ciclo aberto, informam a matrícula e escolhem uma liderança ou um colega ativo do próprio setor. Não precisam criar conta e senha. A matrícula controla participação; não é uma prova forte de identidade de quem está usando o navegador.'],
  ['Uma pessoa pode avaliar o mesmo alvo várias vezes?', 'O servidor permite uma avaliação por participante cadastrado, pessoa avaliada e período. Uma transação no banco impede duplicidade mesmo em envios simultâneos. Proteger a matrícula contra uso por terceiros também faz parte da operação da empresa.'],
  ['O RH identifica quem escreveu uma resposta?', 'As respostas são armazenadas separadamente do controle de participação, sem nome ou matrícula do autor. O painel não apresenta a relação individual entre avaliador e resposta. O mínimo de respostas reduz exposição; comentários, grupos pequenos e acesso técnico ao banco ainda exigem cuidado. Não existe promessa de anonimato absoluto.'],
  ['Onde ficam os dados?', 'A instalação atual usa Firebase Authentication e Firestore do projeto da empresa. O servidor precisa de internet. Um cartão ou uma imagem Docker não contém, sozinho, o banco nem as contas de acesso.'],
  ['Posso instalar em um Raspberry Pi?', 'Sim, em Linux de 64 bits com Docker e configuração compatível. A implantação dedicada mantém um ambiente por empresa. Backup, credenciais e capacidade do equipamento precisam ser validados antes do uso.'],
  ['A Community já está disponível para download?', 'A distribuição pública depende da licença, da revisão do histórico e do fechamento da checklist de release. Os recursos atuais não foram removidos para criar uma edição paga.'],
  ['O que muda na Pro?', 'A proposta inicial é implantação, treinamento e suporte contratado. SSO, integrações e análises adicionais são possibilidades futuras, sem disponibilidade anunciada.'],
  ['Quando posso contratar o Cloud?', 'O Cloud ainda não está disponível. Depende de isolamento multiempresa, recuperação operacional, monitoramento e contratos próprios.'],
  ['Como funcionam atualizações e suporte?', 'Uma atualização dedicada deve preservar configuração e dados, manter imagem anterior e passar por testes. O canal e as condições de suporte serão definidos pelo responsável comercial.'],
] as const;
