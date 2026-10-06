import type { Metadata } from 'next';
import { LeadershipDirectoryForm } from '@/components/forms/leadership-directory-form';
import { getPublicLeadershipContext } from '@/lib/leadership/service';
import { PublicHeader } from '@/components/public-header';
import { PublicState } from '@/components/public-state';

export const metadata: Metadata = {
  title: 'Avaliar liderança',
  description: 'Avalie sua liderança, coordenação ou supervisão sem informar seu nome.',
};

export const dynamic = 'force-dynamic';

export default async function AvaliarPage() {
  const context = await getPublicLeadershipContext().catch(() => null);
  if (!context) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950"><PublicState title="Não foi possível carregar a avaliação" description="O serviço está temporariamente indisponível. Tente novamente em alguns instantes ou avise o RH/DP." retryHref="/avaliar" /></main>
  );
  // No open period
  if (!context.period) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950"><PublicState title="Avaliações encerradas" description="Não há um período de avaliação aberto no momento. Quando o RH/DP abrir um novo período, as avaliações estarão disponíveis aqui." /></main>
    );
  }

  if (!context.availableParticipants) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950"><PublicState title="Nenhum participante disponível" description="O RH/DP ainda precisa cadastrar colaboradores ativos com matrícula e setor." /></main>
    );
  }

  if (context.criteria.length === 0) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950"><PublicState title="Formulário em preparação" description="O RH/DP precisa ativar os critérios antes de receber avaliações." /></main>
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader title="Avaliação de liderança" context={context.period.name} />

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-8 pb-safe-bottom sm:px-6 sm:py-10">
        <LeadershipDirectoryForm context={{ ...context, period: context.period }} />
      </div>
    </main>
  );
}
