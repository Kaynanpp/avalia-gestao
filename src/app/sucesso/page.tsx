import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Home } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Avaliação enviada',
};

export default function SucessoPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 dark:bg-slate-950">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="ui-card w-full max-w-md p-6 text-center sm:p-8">
        <BrandLogo className="mx-auto mb-8 w-44" priority />
        <div className="mb-6 inline-flex">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
            <CheckCircle2 className="h-8 w-8 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          </div>
        </div>

        <h1 className="mb-3 text-2xl font-bold text-slate-950 dark:text-white">
          Avaliação enviada
        </h1>

        <p className="mb-3 leading-relaxed text-slate-700 dark:text-slate-200">
          Sua avaliação foi registrada com sucesso e será acompanhada pelo RH/DP.
        </p>

        <p className="mx-auto mb-7 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          Obrigado por contribuir com o desenvolvimento das pessoas e das equipes.
        </p>

        <div className="mb-7 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <strong>Acesso restrito:</strong> as respostas são tratadas pelo RH/DP.
            Os resultados seguem o mínimo de respostas definido pela empresa para proteger os participantes.
          </p>
        </div>

        <Link
          href="/"
          id="btn-voltar-inicio"
          className="ui-button ui-button-primary"
          aria-label="Voltar à página inicial"
        >
          <Home className="w-4 h-4" aria-hidden="true" />
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
