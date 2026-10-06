import Link from 'next/link';
import { AlertTriangle, ChevronLeft } from 'lucide-react';

export function PublicState({ title, description, retryHref }: { title: string; description: string; retryHref?: string }) {
  return (
    <section className="ui-card mx-auto max-w-md p-7 text-center sm:p-8">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">{title}</h1>
      <p className="mt-3 leading-6 text-slate-600 dark:text-slate-300">{description}</p>
      <Link href={retryHref || '/'} className={retryHref ? 'ui-button ui-button-primary mt-6' : 'ui-button ui-button-secondary mt-6'}>
        {!retryHref && <ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        {retryHref ? 'Tentar novamente' : 'Voltar ao início'}
      </Link>
    </section>
  );
}
