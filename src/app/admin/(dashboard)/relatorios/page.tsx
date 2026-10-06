import Link from 'next/link';
import { BarChart3, Download, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { formatScore } from '@/lib/utils';
import { getAllManagerResults, getSettings } from '@/lib/services/reports.service';
import { getPeriods } from '@/lib/services/periods.service';
import { getDepartments } from '@/lib/services/departments.service';

type ReportsPageProps = {
  searchParams: Promise<{ periodo?: string; setor?: string }>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const query = await searchParams;
  const [periods, departments, settings] = await Promise.all([
    getPeriods(),
    getDepartments(),
    getSettings(),
  ]);

  const defaultPeriod = periods.find((period) => period.status === 'OPEN') || periods[0];
  const selectedPeriod = periods.find((period) => period.id === query.periodo) || defaultPeriod;
  const selectedDepartmentId = query.setor || '';
  const results = selectedPeriod
    ? await getAllManagerResults(
        selectedPeriod.id,
        selectedDepartmentId ? { departmentId: selectedDepartmentId } : {},
        settings.minEvaluationsForDisplay
      )
    : [];
  const chronological = [...periods].filter((period) => period.status !== 'DRAFT').sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  const selectedIndex = selectedPeriod ? chronological.findIndex((period) => period.id === selectedPeriod.id) : -1;
  const previousPeriod = selectedIndex > 0 ? chronological[selectedIndex - 1] : undefined;
  const previousResults = previousPeriod ? await getAllManagerResults(previousPeriod.id, selectedDepartmentId ? { departmentId: selectedDepartmentId } : {}, settings.minEvaluationsForDisplay) : [];

  const visibleResults = results.filter((result) => result.hasEnoughData && result.teamOverallAverage !== null);
  const visibleResponseCount = visibleResults.reduce((total, result) => total + result.teamEvaluationCount, 0);
  const weightedScore = visibleResponseCount > 0
    ? visibleResults.reduce(
        (total, result) => total + (result.teamOverallAverage || 0) * result.teamEvaluationCount,
        0
      ) / visibleResponseCount
    : null;
  const showAggregate = visibleResponseCount >= settings.minEvaluationsForDisplay;
  const previousVisible = previousResults.filter((result) => result.hasEnoughData && result.teamOverallAverage !== null);
  const previousResponses = previousVisible.reduce((total, result) => total + result.teamEvaluationCount, 0);
  const previousWeighted = previousResponses ? previousVisible.reduce((total, result) => total + (result.teamOverallAverage || 0) * result.teamEvaluationCount, 0) / previousResponses : null;
  const protectedCount = results.length - visibleResults.length;

  const criteria = results
    .flatMap((result) => result.criteriaResults)
    .reduce<Map<string, { name: string; total: number; count: number }>>((map, criterion) => {
      if (criterion.teamAverage === null) return map;
      const current = map.get(criterion.criterionId) || {
        name: criterion.criterionName,
        total: 0,
        count: 0,
      };
      current.total += criterion.teamAverage * criterion.teamCount;
      current.count += criterion.teamCount;
      map.set(criterion.criterionId, current);
      return map;
    }, new Map());
  const criterionAverages = [...criteria.values()]
    .map((criterion) => ({ ...criterion, average: criterion.count ? criterion.total / criterion.count : 0 }))
    .sort((a, b) => b.average - a.average);
  const previousCriteria = previousResults.flatMap((result) => result.criteriaResults).reduce<Map<string, { total: number; count: number }>>((map, criterion) => {
    if (criterion.teamAverage === null) return map;
    const current = map.get(criterion.criterionId) || { total: 0, count: 0 };
    current.total += criterion.teamAverage * criterion.teamCount; current.count += criterion.teamCount; map.set(criterion.criterionId, current); return map;
  }, new Map());

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">Visão analítica</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Relatórios</h1>
          <p className="mt-1 text-slate-500">Resultados das lideranças por período e setor. As avaliações de colegas têm acompanhamento próprio.</p>
          <Link href="/admin/colegas" className="mt-2 inline-flex text-sm font-semibold text-orange-600 hover:underline">Ver avaliações de colegas</Link>
        </div>
        <Link
          href={selectedPeriod ? `/api/admin/relatorios/export?periodo=${encodeURIComponent(selectedPeriod.id)}${selectedDepartmentId ? `&setor=${encodeURIComponent(selectedDepartmentId)}` : ''}` : '#'}
          aria-disabled={!selectedPeriod || results.length === 0}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${selectedPeriod && results.length ? 'bg-slate-900 text-white hover:bg-slate-800' : 'pointer-events-none bg-slate-200 text-slate-400'}`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Baixar Excel
        </Link>
      </header>

      <form action="/admin/relatorios" className="ui-filter-bar sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="periodo" className="text-sm font-medium text-slate-700">Período</label>
          <select id="periodo" name="periodo" defaultValue={selectedPeriod?.id || ''} className="ui-input">
            <option value="">Selecione um período</option>
            {periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="setor" className="text-sm font-medium text-slate-700">Setor</label>
          <select id="setor" name="setor" defaultValue={selectedDepartmentId} className="ui-input">
            <option value="">Todos os setores</option>
            {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
          </select>
        </div>
        <button type="submit" className="ui-button ui-button-primary">Aplicar filtros</button>
      </form>

      {!selectedPeriod ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-slate-300" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">Nenhum período cadastrado</h2>
          <p className="mt-1 text-sm text-slate-500">Crie um período para começar a acompanhar os resultados.</p>
          <Link href="/admin/periodos" className="mt-4 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">Gerenciar períodos</Link>
        </div>
      ) : (
        <>
          <section aria-label="Resumo do período" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Lideranças no filtro" value={results.length.toString()} detail={selectedPeriod.name} />
            <MetricCard label="Resultados disponíveis" value={`${visibleResults.length} / ${results.length}`} detail={`${protectedCount} aguardando o mínimo de respostas`} />
            <MetricCard label="Respostas consideradas" value={showAggregate ? visibleResponseCount.toString() : 'Protegido'} detail={`Mínimo de ${settings.minEvaluationsForDisplay} por liderança`} />
            <MetricCard label="Média e evolução" value={showAggregate ? formatScore(weightedScore) : '—'} detail={showAggregate && weightedScore !== null && previousWeighted !== null ? `${weightedScore - previousWeighted >= 0 ? '+' : ''}${(weightedScore - previousWeighted).toFixed(2)} vs. ${previousPeriod?.name}` : 'Sem ciclo anterior comparável'} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="ui-table-shell">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Resultados por liderança</h2>
                <p className="mt-1 text-sm text-slate-500">A nota e a quantidade de respostas aparecem depois do mínimo de {settings.minEvaluationsForDisplay} avaliações por liderança. Cada critério também precisa atingir esse mínimo. O RH/DP acompanha os comentários na área Comentários.</p>
              </div>
              {results.length === 0 ? (
                <p className="px-5 py-12 text-center text-sm text-slate-500">Nenhuma liderança encontrada para este filtro.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="ui-table">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr><th className="px-5 py-3 font-semibold">Liderança</th><th className="px-5 py-3 font-semibold">Setor</th><th className="px-5 py-3 font-semibold">Nota da equipe</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.map((result) => (
                        <tr key={result.managerId} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3.5"><Link href={`/admin/relatorios/${result.managerId}?periodo=${encodeURIComponent(selectedPeriod.id)}`} className="font-medium text-orange-700 hover:underline">{result.managerName}</Link><div className="text-xs text-slate-500">{result.position}</div></td>
                          <td className="px-5 py-3.5 text-slate-600">{result.departmentName || '—'}</td>
                          <td className="px-5 py-3.5">
                            {result.hasEnoughData
                              ? <div><span className="font-semibold text-slate-900">{formatScore(result.teamOverallAverage)}</span><span className="ml-2 text-xs text-slate-500">{result.teamEvaluationCount} respostas</span></div>
                              : <span className="inline-flex items-center gap-1.5 text-xs text-slate-500" title={`A nota será liberada após ${settings.minEvaluationsForDisplay} avaliações desta liderança`}><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />Aguardando mínimo para liberar a média</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="ui-card p-5">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">Médias por critério</h2>
                <p className="mt-1 text-sm text-slate-500">Considera apenas lideranças e critérios com volume suficiente para preservar o anonimato.</p>
              </div>
              {criterionAverages.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Ainda não há dados suficientes para exibir este recorte.</p>
              ) : (
                <div className="space-y-5">
                  {criterionAverages.map((criterion) => (
                        <div key={criterion.name}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{criterion.name}</span><span className="font-semibold tabular-nums text-slate-900">{formatScore(criterion.average)}</span></div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${criterion.name}: ${formatScore(criterion.average)} de 5`}>
                        <div className="h-full rounded-full bg-orange-600" style={{ width: `${Math.max(0, Math.min(100, (criterion.average / 5) * 100))}%` }} />
                          </div>
                          {(() => { const keyed = [...criteria.entries()].find(([, value]) => value.name === criterion.name)?.[0]; const prior = keyed ? previousCriteria.get(keyed) : undefined; const priorAverage = prior?.count ? prior.total / prior.count : null; if (priorAverage === null || priorAverage === undefined) return null; const change = criterion.average - priorAverage; return <p className={`mt-1 flex items-center gap-1 text-xs ${Math.abs(change) < 0.05 ? 'text-slate-500' : change > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{Math.abs(change) < 0.05 ? 'Estável' : change > 0 ? <><TrendingUp className="h-3 w-3" />+{change.toFixed(2)}</> : <><TrendingDown className="h-3 w-3" />{change.toFixed(2)}</>} {previousPeriod ? `vs. ${previousPeriod.name}` : ''}</p>; })()}
                        </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="ui-card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{detail}</p>
    </div>
  );
}
