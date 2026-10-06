import Link from 'next/link';
import { EDITIONS, PRODUCT, productPublication } from '@/lib/product';

export function generateMetadata() {
  const { siteUrl } = productPublication();
  return { title: 'Community, Pro e Cloud', description: 'Compare a proposta de edições do Avalia Gestão. Funcionalidades atuais preservadas, sem preços definitivos.', ...(siteUrl ? { alternates: { canonical: `${siteUrl}/produto/edicoes` } } : {}) };
}
const matrix = [
  ['Lideranças e colegas por setor', 'Núcleo atual', 'Núcleo atual', 'Planejado'],
  ['Ciclos, critérios e participação única', 'Núcleo atual', 'Núcleo atual', 'Planejado'],
  ['Proteção de resultados e comentários', 'Núcleo atual', 'Núcleo atual', 'Planejado'],
  ['RH/ADMIN, relatórios e Excel', 'Núcleo atual', 'Núcleo atual', 'Planejado'],
  ['Importação e planos de desenvolvimento', 'Núcleo atual', 'Núcleo atual', 'Planejado'],
  ['Hospedagem e operação', 'Sua equipe', 'Sua equipe / contrato', 'Gerenciadas, futuras'],
  ['Implantação e treinamento', 'Documentação', 'Serviço contratado', 'A definir'],
  ['Suporte e recuperação assistida', 'Sem SLA anunciado', 'Contrato específico', 'A definir'],
  ['SSO, integrações e análises avançadas', 'Não implementados', 'Possibilidades futuras', 'Possibilidades futuras'],
] as const;
export default function EditionsPage() {
  return <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="text-xs font-semibold uppercase tracking-wider text-orange-800 dark:text-orange-300">Modelo em definição</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">Escolha como sua empresa vai operar.</h1><p className="mt-5 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">A base funcional é a mesma. A proposta diferencia distribuição e serviços, sem retirar recursos existentes para fabricar limitações comerciais. Nenhuma assinatura está disponível neste momento.</p><div className="mt-9 grid gap-5 md:grid-cols-3">{EDITIONS.map((edition) => <article key={edition.name} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-medium text-orange-800 dark:text-orange-300">{edition.state}</p><h2 className="mt-3 text-2xl font-semibold">{edition.name}</h2><p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{edition.summary}</p><ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-6">{edition.details.map((detail) => <li key={detail}>{detail}</li>)}</ul></article>)}</div><div className="mt-10 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[640px] text-left text-sm"><caption className="bg-white p-5 text-left font-semibold dark:bg-slate-900">Comparação da proposta · recursos futuros não estão disponíveis</caption><thead className="bg-slate-100 dark:bg-slate-800"><tr>{['Recurso', 'Community', 'Pro', 'Cloud'].map((name) => <th key={name} scope="col" className="px-5 py-4 font-semibold">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-900">{matrix.map(([feature, ...values]) => <tr key={feature}><th scope="row" className="px-5 py-4 font-medium">{feature}</th>{values.map((value, i) => <td key={i} className="px-5 py-4 text-slate-600 dark:text-slate-300">{value}</td>)}</tr>)}</tbody></table></div><section className="mt-10 rounded-xl border border-orange-200 p-7 dark:border-orange-900"><h2 className="text-2xl font-semibold">Enterprise: um escopo, não um selo.</h2><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">Implantação privada, treinamento, customização, integrações e condições de suporte podem ser propostas após análise. SLA, SSO e retenção avançada exigem entrega técnica e contrato; não são funcionalidades anunciadas como prontas.</p><Link href={PRODUCT.paths.contact} className="mt-5 inline-block font-semibold underline underline-offset-4">Preparar requisitos de implantação</Link></section></div>;
}
