import Link from 'next/link';
import { notFound } from 'next/navigation';
import guides from '@/content/public-guides.json';
import { PRODUCT, productPublication } from '@/lib/product';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) return {};
  const { siteUrl } = productPublication();
  return { title: guide.title, description: guide.summary, ...(siteUrl ? { alternates: { canonical: `${siteUrl}${PRODUCT.paths.docs}/${guide.slug}` } } : {}) };
}
export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((item) => item.slug === slug);
  if (!guide) notFound();
  return <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8"><Link href={PRODUCT.paths.docs} className="text-sm font-semibold underline underline-offset-4">← Documentação</Link><h1 className="mt-7 text-4xl font-semibold tracking-tight">{guide.title}</h1><p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">{guide.summary}</p><h2 className="mt-9 text-xl font-semibold">Procedimento</h2><ol className="mt-5 list-decimal space-y-5 pl-6 text-sm leading-7">{guide.steps.map((step) => <li key={step} className="pl-2">{step}</li>)}</ol>{guide.commands && <section className="mt-8"><h2 className="text-xl font-semibold">Comandos de referência</h2><pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-5 text-sm leading-7 text-slate-100"><code>{guide.commands}</code></pre></section>}<aside className="mt-8 rounded-xl border border-orange-200 bg-orange-50 p-5 text-sm leading-7 text-orange-950 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-100"><h2 className="font-semibold">Antes de prosseguir</h2><p className="mt-2">{guide.note}</p></aside><p className="mt-8 text-xs leading-6 text-slate-600 dark:text-slate-400">Documento da versão {PRODUCT.version}. Condições comerciais e licença ainda em definição.</p></article>;
}
