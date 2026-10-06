import type { Metadata } from 'next';
import Link from 'next/link';
import { Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Modalidade encerrada',
  description: 'A autoavaliação foi encerrada. Conheça a avaliação de lideranças e de colegas de setor.',
};

export default function RetiredSelfEvaluationPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-16 dark:bg-slate-950">
      <section className="ui-card w-full max-w-xl p-8">
        <Users className="mb-5 h-10 w-10 text-orange-600" aria-hidden="true" />
        <h1 className="text-2xl font-bold text-slate-900">A autoavaliação foi encerrada</h1>
        <p className="mt-4 leading-relaxed text-slate-600">Agora você pode avaliar uma liderança ou um colega do seu setor. Os links antigos de autoavaliação não recebem respostas e não servem como convites para avaliar colegas.</p>
        <p className="mt-3 leading-relaxed text-slate-600">Para avaliar um colega, acesse o formulário geral e informe sua matrícula. O sistema mostrará somente as pessoas do seu setor.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/avaliar-colega" className="ui-button ui-button-primary">Avaliar um colega</Link>
          <Link href="/avaliar" className="ui-button ui-button-secondary">Avaliar liderança</Link>
        </div>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-orange-600 hover:underline">Voltar ao início</Link>
      </section>
    </main>
  );
}

