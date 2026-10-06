import Link from 'next/link';
import { PeerEvaluationForm } from '@/components/peer/evaluation-form';
import { getPublicPeerTokenContext } from '@/lib/peer/service';
import { PublicHeader } from '@/components/public-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Avaliação de colega do setor', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function PeerEvaluationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const context = await getPublicPeerTokenContext(token).catch(() => null);
  if (!context) return <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-slate-950"><div className="ui-card max-w-md p-8 text-center"><h1 className="text-2xl font-bold text-slate-950 dark:text-white">Link indisponível</h1><p className="mt-3 leading-6 text-slate-600 dark:text-slate-300">Este link expirou, já foi utilizado ou está indisponível. Solicite orientação ao RH/DP.</p><Link href="/" className="ui-button ui-button-primary mt-6">Voltar ao início</Link></div></main>;
  return <main className="min-h-screen bg-slate-100 dark:bg-slate-950"><PublicHeader title="Avaliação de colega" context="Colegas do setor" /><div className="mx-auto max-w-2xl px-4 py-6 sm:py-8"><PeerEvaluationForm token={token} {...context} /></div></main>;
}
