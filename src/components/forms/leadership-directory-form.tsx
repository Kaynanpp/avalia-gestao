'use client';

import { useState } from 'react';
import { CheckCircle2, ChevronRight, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import type { LeadershipAccessContext, LeadershipCandidate, PublicLeadershipContext } from '@/lib/leadership/types';
import { EvaluationForm } from './evaluation-form';

export function LeadershipDirectoryForm({ context }: { context: PublicLeadershipContext & { period: { id: string; name: string } } }) {
  const [registration, setRegistration] = useState('');
  const [access, setAccess] = useState<LeadershipAccessContext | null>(null);
  const [selected, setSelected] = useState<LeadershipCandidate | null>(null);
  const [accessing, setAccessing] = useState(false);
  const [error, setError] = useState('');
  const [successName, setSuccessName] = useState('');

  async function identify(event: React.FormEvent) {
    event.preventDefault();
    if (accessing) return;
    setAccessing(true); setError(''); setSuccessName('');
    try {
      const response = await fetch('/api/avaliacoes/acesso', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registration }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível validar a matrícula.');
      setAccess(result.data); setRegistration('');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível validar a matrícula.'); }
    finally { setAccessing(false); }
  }

  function completed(managerId: string) {
    if (!access) return;
    const manager = access.leaders.find((item) => item.id === managerId);
    setAccess({ ...access, leaders: access.leaders.map((item) => item.id === managerId ? { ...item, completed: true } : item) });
    setSuccessName(manager?.name || 'liderança');
    setSelected(null);
  }

  if (!access) return <section className="mx-auto max-w-xl space-y-6">
    <header><p className="ui-eyebrow">{context.period.name}</p><h1 className="ui-title">Identifique sua participação</h1><p className="ui-description">Informe sua matrícula para visualizar as lideranças do seu setor. Não é necessário criar conta ou senha.</p></header>
    <form onSubmit={identify} className="ui-card space-y-4 p-5 sm:p-6"><label htmlFor="leadership-registration" className="ui-label">Matrícula<span className="relative mt-1 block"><KeyRound className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-slate-400" /><input id="leadership-registration" required autoComplete="off" maxLength={40} value={registration} onChange={(event) => setRegistration(event.target.value)} className="ui-input pl-11 text-base" placeholder="Digite sua matrícula" /></span></label>{error && <p role="alert" className="ui-alert-error">{error}</p>}<button disabled={accessing} className="ui-button-primary w-full py-3">{accessing ? 'Validando matrícula...' : 'Continuar'}</button></form>
    <div className="ui-alert-success"><ShieldCheck className="mr-2 inline h-4 w-4" />A matrícula controla somente a participação. Ela não é gravada junto às notas ou ao comentário.</div>
  </section>;

  if (selected) return <div className="space-y-5"><button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-orange-700">← Voltar às lideranças</button><EvaluationForm managers={[selected]} initialManager={selected} criteria={access.criteria.map((criterion, index) => ({ ...criterion, order: index + 1 }))} periodId={access.period.id} periodName={access.period.name} commentsEnabled={access.commentsEnabled} participationToken={access.participationToken} onSuccess={completed} onBackToLeaders={() => setSelected(null)} /></div>;

  const pending = access.leaders.filter((leader) => !leader.completed);
  return <section className="space-y-6">
    <header className="ui-page-header"><div><p className="ui-eyebrow">{access.period.name}</p><h1 className="ui-title">Avaliações disponíveis</h1><p className="ui-description">Olá, {access.participantName}. Estas são as lideranças ativas do setor {access.departmentName}.</p></div><button type="button" onClick={() => { setAccess(null); setSelected(null); setSuccessName(''); }} className="ui-button-secondary">Trocar matrícula</button></header>
    {successName && <div role="status" className="ui-alert-success flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><strong>Avaliação enviada com sucesso.</strong><p className="mt-1">A participação referente a {successName} foi concluída.</p></div></div>}
    {access.leaders.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-600 dark:border-white/20 dark:text-slate-300">Não há lideranças ativas vinculadas ao seu setor neste ciclo.</p> : <div className="grid gap-3 sm:grid-cols-2">{access.leaders.map((leader) => <article key={leader.id} className={`flex items-center gap-3 rounded-xl border p-4 ${leader.completed ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/20 dark:bg-emerald-500/10' : 'border-slate-200 bg-white dark:border-white/15 dark:bg-white/5'}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${leader.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{leader.completed ? <CheckCircle2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><h2 className="truncate font-semibold text-slate-900 dark:text-white">{leader.name}</h2><p className="truncate text-sm text-slate-500 dark:text-slate-400">{leader.position}</p><p className={`mt-1 text-xs font-medium ${leader.completed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{leader.completed ? 'Avaliação realizada' : 'Pendente'}</p></div><button type="button" disabled={leader.completed} onClick={() => setSelected(leader)} className="inline-flex min-h-11 items-center gap-1 rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-transparent disabled:px-0 disabled:text-emerald-700 dark:disabled:text-emerald-300">{leader.completed ? 'Concluída' : 'Avaliar'}{!leader.completed && <ChevronRight className="h-4 w-4" />}</button></article>)}</div>}
    {access.leaders.length > 0 && pending.length === 0 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-2 font-semibold text-emerald-950">Você concluiu todas as avaliações de liderança disponíveis neste ciclo.</p></div>}
    <p className="ui-alert-info text-xs">Cada liderança pode ser avaliada uma vez por participante em cada ciclo. O controle de conclusão fica separado do conteúdo anônimo.</p>
  </section>;
}
