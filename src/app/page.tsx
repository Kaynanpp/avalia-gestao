import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, MessageSquare, ShieldCheck, Users, Star } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { PRODUCT, COMPANY_BRAND } from '@/lib/product';

export const metadata: Metadata = {
  title: 'Lideranças e Colegas',
  description: 'Avalie as lideranças e os colegas do seu setor. Sua contribuição ajuda a melhorar o trabalho em equipe.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between gap-4">
          <BrandLogo className="w-40 sm:w-52" priority />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/admin/login" className="ui-button-secondary">Acesso RH/DP</Link>
          </div>
        </header>
        <section className="mx-auto max-w-3xl pb-10 pt-14 text-center sm:pb-12 sm:pt-20">
          <p className="ui-eyebrow">{PRODUCT.name} · {COMPANY_BRAND.name}</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Sua experiência ajuda a melhorar o trabalho de todos</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">Escolha o tipo de avaliação, informe sua matrícula e compartilhe uma opinião respeitosa sobre o dia a dia da equipe.</p>
        </section>
        <section aria-label="Escolha a modalidade de avaliação" className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-xl border border-orange-200 bg-white p-6 dark:border-orange-900/60 dark:bg-slate-900 sm:p-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"><Star className="h-5 w-5" aria-hidden="true" /></span>
            <h2 className="mt-5 text-xl font-bold">Avaliar uma liderança</h2>
            <p className="mt-3 flex-1 leading-relaxed text-slate-600 dark:text-slate-300">Informe sua matrícula e avalie gerentes, coordenadores, supervisores e líderes do seu setor. Não é necessário criar uma conta.</p>
            <Link href="/avaliar" id="btn-avaliar-lideranca" className="ui-button-primary mt-7">Começar avaliação <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><Users className="h-5 w-5" aria-hidden="true" /></span>
            <h2 className="mt-5 text-xl font-bold">Avaliar um colega do setor</h2>
            <p className="mt-3 flex-1 leading-relaxed text-slate-600 dark:text-slate-300">Informe sua matrícula e escolha uma pessoa do seu setor. Não precisa receber convite individual nem criar uma conta.</p>
            <Link href="/avaliar-colega" className="ui-button-secondary mt-7">Avaliar um colega <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
        </section>
        <section aria-label="Sobre as avaliações" className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" aria-hidden="true" />
            <div><h2 className="font-semibold">Acompanhamento pelo RH/DP</h2><p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">As notas e os comentários são acessados pela equipe autorizada. Os resultados respeitam um mínimo de respostas para proteger os participantes.</p></div>
          </div>
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-orange-600 dark:text-orange-300" aria-hidden="true" />
            <div><h2 className="font-semibold">Comentários que ajudam</h2><p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Descreva situações de trabalho com respeito. Evite nomes de terceiros e informações pessoais desnecessárias no comentário.</p></div>
          </div>
        </section>
        <footer className="mt-10 border-t border-slate-200 pt-6 text-center text-xs text-slate-500 dark:border-slate-800">{COMPANY_BRAND.name} · Uso interno · Em caso de dúvida, procure o RH/DP.</footer>
      </div>
    </main>
  );
}

