import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT, productPublication } from '@/lib/product';
import { ProductLogo } from '@/components/product/product-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export const dynamic = 'force-dynamic';
export function generateMetadata(): Metadata {
  const { siteUrl, indexable } = productPublication();
  return { title: { default: PRODUCT.name, template: `%s | ${PRODUCT.name}` }, description: PRODUCT.description,
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    robots: { index: indexable, follow: indexable }, icons: { icon: '/brand/avalia-gestao.svg', apple: '/brand/avalia-gestao.svg' },
    openGraph: { type: 'website', locale: 'pt_BR', siteName: PRODUCT.name, title: PRODUCT.name, description: PRODUCT.description },
    twitter: { card: 'summary_large_image' },
  };
}
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const { repositoryUrl, applicationUrl, docsUrl } = productPublication();
  return <div className="min-h-screen bg-[#faf8f5] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <a href="#conteudo-produto" className="sr-only z-50 rounded bg-slate-900 p-3 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Ir para o conteúdo</a>
    <header className="border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8"><ProductLogo /><nav aria-label="Navegação do produto" className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm"><Link className="hover:underline" href="/produto#recursos">Recursos</Link><Link className="hover:underline" href={PRODUCT.paths.editions}>Edições</Link><Link className="hover:underline" href={PRODUCT.paths.docs}>Documentação</Link><Link className="hover:underline" href={PRODUCT.paths.demo}>Demonstração</Link><ThemeToggle />{applicationUrl && <a className="font-semibold hover:underline" href={applicationUrl}>Acessar instalação</a>}</nav></div></header>
    <main id="conteudo-produto" tabIndex={-1} className="outline-none">{children}</main>
    <footer className="mt-12 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"><div className="mx-auto grid max-w-7xl gap-7 px-5 py-9 text-sm sm:grid-cols-[1fr_auto] sm:px-8"><div><p className="font-semibold">{PRODUCT.name}</p><p className="mt-2 max-w-lg leading-6 text-slate-600 dark:text-slate-400">Avaliações para transformar a experiência de trabalho em acompanhamento pelo RH.</p><p className="mt-4 text-xs text-slate-600 dark:text-slate-400">© {new Date().getFullYear()} {PRODUCT.copyright} · {PRODUCT.version} · Licença de distribuição em definição.</p></div><nav aria-label="Links do rodapé" className="flex flex-wrap gap-5"><Link href={PRODUCT.paths.contact}>Instalação e contato</Link><Link href="/produto#privacidade">Privacidade</Link><a href={docsUrl || PRODUCT.paths.docs}>Primeiros passos</a>{repositoryUrl && <a href={repositoryUrl}>Repositório</a>}</nav></div></footer>
  </div>;
}
