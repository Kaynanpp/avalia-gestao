import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { PublicHeader } from '@/components/public-header';
import { PublicPeerDirectoryForm } from '@/components/peer/public-directory-form';
import { getPublicPeerContext } from '@/lib/peer/service';
import { PublicState } from '@/components/public-state';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Avaliar colega do setor', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };

export default async function PeerEntryPage() {
  const context = await getPublicPeerContext().catch(() => null);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicHeader title="Avaliação entre colegas" context={context?.period?.name} />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {!context ? (
          <PublicState title="Não foi possível carregar a avaliação" description="Tente novamente em alguns instantes ou avise o RH/DP." retryHref="/avaliar-colega" />
        ) : !context.period ? (
          <PublicState title="Avaliações encerradas" description="Não há um período de avaliação aberto no momento." />
        ) : !context.criteria.length ? (
          <PublicState title="Formulário em preparação" description="O RH/DP precisa ativar os critérios para colegas." />
        ) : !context.availableCoworkers ? (
          <PublicState title="Nenhum colega disponível" description="O RH/DP ainda precisa cadastrar as pessoas dos setores." />
        ) : (
          <PublicPeerDirectoryForm context={{ ...context, period: context.period }} />
        )}
        <Link href="/" className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-orange-700"><ChevronLeft className="h-4 w-4" />Voltar ao início</Link>
      </div>
    </main>
  );
}
