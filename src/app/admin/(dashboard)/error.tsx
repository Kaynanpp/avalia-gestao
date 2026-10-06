'use client';

import { AlertCircle } from 'lucide-react';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="ui-card mx-auto max-w-lg p-8 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"><AlertCircle className="h-6 w-6" aria-hidden="true" /></span><h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">Não foi possível carregar esta área</h1><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Ocorreu uma falha temporária ao buscar as informações. Tente novamente em alguns instantes.</p><button onClick={reset} className="ui-button ui-button-primary mt-6">Tentar novamente</button></div>;
}
