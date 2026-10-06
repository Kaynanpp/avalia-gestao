'use client';

import { useEffect, useState } from 'react';
import { Download, MessageSquareText } from 'lucide-react';

type FilterOption = { id: string; name: string };
type TeamComment = { id: string; comment: string; createdAt: string };

export function TeamCommentsPage({
  periods,
  managers,
  initialPeriodId,
}: {
  periods: FilterOption[];
  managers: FilterOption[];
  initialPeriodId: string;
}) {
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [managerId, setManagerId] = useState(managers[0]?.id || '');
  const [managerName, setManagerName] = useState('');
  const [periodName, setPeriodName] = useState('');
  const [comments, setComments] = useState<TeamComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [protectedResult, setProtectedResult] = useState(false);
  const [minimum, setMinimum] = useState(0);

  useEffect(() => {
    if (!periodId || !managerId) {
      setComments([]);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/admin/comentarios?periodId=${encodeURIComponent(periodId)}&managerId=${encodeURIComponent(managerId)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível carregar os comentários.');
        setComments(result.data.comments);
        setManagerName(result.data.managerName);
        setPeriodName(result.data.periodName);
        setProtectedResult(Boolean(result.data.protected));
        setMinimum(Number(result.data.minimum) || 0);
      })
      .catch((fetchError) => {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return;
        setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível carregar os comentários.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });

    return () => controller.abort();
  }, [periodId, managerId]);

  const downloadCsv = () => {
    if (comments.length === 0) return;
    const escape = (value: string) => {
      const spreadsheetSafe = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${spreadsheetSafe.replaceAll('"', '""')}"`;
    };
    const rows = [
      ['Data', 'Comentário'],
      ...comments.map((item) => [
        new Date(`${item.createdAt}T12:00:00`).toLocaleDateString('pt-BR'),
        item.comment,
      ]),
    ];
    const content = `\uFEFF${rows.map((row) => row.map(escape).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `comentarios-${managerName || 'lideranca'}-${periodName || 'periodo'}.csv`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9.-]+/g, '-');
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium text-orange-600">RH/DP</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Comentários da equipe</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">Leia as observações enviadas junto às avaliações e exporte uma cópia para análise.</p>
      </header>

      <section className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="comment-period" className="text-sm font-medium text-slate-700">Período</label>
          <select id="comment-period" value={periodId} onChange={(event) => setPeriodId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="">Selecione um período</option>
            {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="comment-manager" className="text-sm font-medium text-slate-700">Liderança</label>
          <select id="comment-manager" value={managerId} onChange={(event) => setManagerId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
            <option value="">Selecione uma liderança</option>
            {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
          </select>
        </div>
        <button onClick={downloadCsv} disabled={comments.length === 0 || loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar CSV
        </button>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-semibold text-slate-900">{managerName || 'Comentários recebidos'}</h2><p className="mt-0.5 text-xs text-slate-500">{periodName || 'Selecione o período e a liderança'}</p></div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{comments.length} comentários</span>
        </div>
        <div className="border-b border-orange-100 bg-orange-50/70 px-5 py-3 text-sm text-orange-950">
          As respostas não guardam o nome do funcionário. Os comentários aparecem sem identificação individual.
        </div>
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500">Carregando comentários...</p>
        ) : error ? (
          <p role="alert" className="p-8 text-center text-sm text-red-700">{error}</p>
        ) : protectedResult ? (
          <div className="flex flex-col items-center p-10 text-center"><MessageSquareText className="h-10 w-10 text-emerald-500" aria-hidden="true" /><p className="mt-3 font-medium text-slate-800">Comentários protegidos por anonimato</p><p className="mt-1 text-sm text-slate-600">São necessárias pelo menos {minimum} respostas para liberar os comentários desta liderança.</p></div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center p-10 text-center"><MessageSquareText className="h-10 w-10 text-slate-300" aria-hidden="true" /><p className="mt-3 text-sm text-slate-600">Ainda não há comentários para este filtro.</p></div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {comments.map((item) => (
              <li key={item.id} className="px-5 py-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{item.comment}</p>
                <p className="mt-2 text-xs text-slate-500">Anônimo · {new Date(`${item.createdAt}T12:00:00`).toLocaleDateString('pt-BR')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
