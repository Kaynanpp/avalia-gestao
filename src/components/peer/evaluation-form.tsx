'use client';
import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, MessageSquare, Users } from 'lucide-react';
import type { PeerCriterion, PeerScores } from '@/lib/peer/types';

const labels = ['Muito ruim', 'Precisa melhorar', 'Adequado', 'Muito bom', 'Excelente'];

type PeerEvaluationFormProps = {
  token?: string;
  coworkerId?: string;
  periodId?: string;
  participationToken?: string;
  coworkerName: string;
  departmentName: string;
  periodName: string;
  commentsEnabled: boolean;
  criteria: PeerCriterion[];
  onBack?: () => void;
  onEvaluateAnother?: () => void;
};

export function PeerEvaluationForm({ token, coworkerId, periodId, participationToken, coworkerName, departmentName, periodName, commentsEnabled, criteria, onBack, onEvaluateAnother }: PeerEvaluationFormProps) {
  const [scores, setScores] = useState<Partial<PeerScores>>({});
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const answered = criteria.filter((criterion) => scores[criterion.id]).length;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError('');
    if (answered !== criteria.length || !confirmed) { setError('Responda todos os critérios e confirme que esta pessoa é um colega do seu setor.'); return; }
    setPending(true);
    try {
      const endpoint = token ? '/api/colegas' : '/api/avaliacoes-colegas';
      const body = token
        ? { token, scores, comment: commentsEnabled ? comment : '', colleagueConfirmed: confirmed }
        : { coworkerId, periodId, participationToken, scores, comment: commentsEnabled ? comment : '', colleagueConfirmed: confirmed };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível enviar sua avaliação.');
      setSubmitted(true);
      setComment('');
      setScores({});
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível enviar sua avaliação. Confira sua conexão.'); }
    finally { setPending(false); }
  }

  if (submitted) return <section role="status" className="ui-card p-7 text-center sm:p-9"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span><h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Avaliação enviada</h1><p className="mt-3 leading-6 text-slate-600 dark:text-slate-300">Sua contribuição sobre {coworkerName} foi registrada.</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">O controle registra somente que você participou. Seu nome e sua matrícula não são gravados junto às notas ou ao comentário.</p>{token ? <Link href="/" className="ui-button-primary mt-6">Voltar ao início</Link> : <button type="button" onClick={onEvaluateAnother || (() => window.location.reload())} className="ui-button-primary mt-6">Avaliar outro colega</button>}</section>;

  const progress = criteria.length ? `${answered / criteria.length * 100}%` : '0%';
  return <div className="space-y-6"><header className="ui-card p-5 sm:p-6">{onBack && <button type="button" onClick={onBack} className="ui-button-quiet mb-4 -ml-3"><ChevronLeft className="h-4 w-4" />Escolher outra pessoa</button>}<div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"><Users className="h-5 w-5" aria-hidden="true" /></span><div><p className="ui-eyebrow">Você está avaliando</p><h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{coworkerName}</h1><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{departmentName} · {periodName}</p></div></div><p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-300">Pense no trabalho que vocês realizam juntos. Responda com sinceridade e respeito.</p><p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">O RH/DP pode ler os comentários sem identificação individual. O controle de participação fica separado do conteúdo da resposta.</p></header><form onSubmit={submit} className="space-y-5"><div className="ui-card sticky top-[4.5rem] z-10 p-4"><div className="flex justify-between text-sm font-medium text-slate-700 dark:text-slate-200"><span>Seu progresso</span><span>{answered} de {criteria.length}</span></div><div role="progressbar" aria-label="Critérios respondidos" aria-valuemin={0} aria-valuemax={criteria.length} aria-valuenow={answered} className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: progress }} /></div></div>{criteria.map((criterion, index) => <fieldset key={criterion.id} disabled={pending} className="ui-card p-4 sm:p-5"><legend className="px-1 text-base font-semibold text-slate-900 dark:text-white">{index + 1}. {criterion.name}</legend><p className="mb-4 text-sm leading-6 text-slate-500 dark:text-slate-400">{criterion.description}</p><div className="grid grid-cols-5 gap-1.5 sm:gap-2">{labels.map((label, score) => <label key={score} className={`flex min-h-[4.75rem] cursor-pointer flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors ${scores[criterion.id] === score + 1 ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-600 dark:bg-orange-950/40 dark:text-orange-100' : 'border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/40 dark:border-slate-700 dark:text-slate-300'}`}><input className="peer sr-only" type="radio" name={criterion.id} value={score + 1} required checked={scores[criterion.id] === score + 1} onChange={() => setScores((current) => ({ ...current, [criterion.id]: score + 1 }))} /><span className="rounded text-base font-bold peer-focus-visible:ring-2 peer-focus-visible:ring-orange-600">{score + 1}</span><span className="mt-1 text-[9px] leading-tight sm:text-[11px]">{label}</span></label>)}</div></fieldset>)}{commentsEnabled && <section className="ui-card p-5"><label htmlFor="peer-comment" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><MessageSquare className="h-4 w-4" aria-hidden="true" />Comentário para o RH/DP <span className="text-xs font-normal text-slate-500">Opcional</span></label><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Conte um ponto positivo ou uma oportunidade de melhoria, com exemplos do trabalho. Evite nomes de outras pessoas e informações pessoais.</p><textarea id="peer-comment" value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={5} disabled={pending} className="ui-input mt-3 resize-y" /><p className="mt-1 text-right text-xs text-slate-500">{comment.length}/1.000</p></section>}<label className="ui-card flex items-start gap-3 p-4 text-sm leading-6 text-slate-700 dark:text-slate-200"><input type="checkbox" required checked={confirmed} disabled={pending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-orange-600" />Confirmo que trabalho no mesmo setor de {coworkerName} e que não estou avaliando a mim próprio.</label>{error && <p role="alert" className="ui-alert-error">{error}</p>}<button type="submit" disabled={pending} className="ui-button-primary w-full py-3">{pending ? 'Enviando avaliação...' : 'Enviar avaliação'}</button><p className="text-center text-xs leading-5 text-slate-500">Confira suas respostas antes de enviar.</p></form></div>;
}
