import { getAllManagerResults } from '@/lib/services/reports.service';
import { getPeriods } from '@/lib/services/periods.service';
import { getSettings } from '@/lib/services/reports.service';
import { FileText, Download } from 'lucide-react';
import { formatScore } from '@/lib/utils';
import Link from 'next/link';
import { EmptyState, PageHeader } from '@/components/ui/product-ui';

export default async function AvaliacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const query = await searchParams;
  const [periods, settings] = await Promise.all([getPeriods(), getSettings()]);
  
  // Use selected period or the first open/closed one, or just the first one
  const defaultPeriod = periods.find(p => p.status === 'OPEN') 
    || periods.find(p => p.status === 'CLOSED')
    || periods[0];
    
  const selectedPeriodId = periods.find((period) => period.id === query.periodo)?.id || defaultPeriod?.id;

  let results: Awaited<ReturnType<typeof getAllManagerResults>> = [];
  
  if (selectedPeriodId) {
    results = await getAllManagerResults(selectedPeriodId, {}, settings.minEvaluationsForDisplay);
  }

  return (
    <div className="ui-page">
      <PageHeader eyebrow="Avaliações" title="Resultados de lideranças" description={`A média da equipe aparece quando cada liderança atinge ${settings.minEvaluationsForDisplay} respostas. Até lá, o resultado permanece protegido.`} actions={
        <Link
          href={selectedPeriodId ? `/api/admin/relatorios/export?periodo=${encodeURIComponent(selectedPeriodId)}` : '#'}
          aria-disabled={!selectedPeriodId || results.length === 0}
          className={`ui-button ${selectedPeriodId && results.length ? 'bg-slate-900 text-white hover:bg-slate-800' : 'pointer-events-none bg-slate-200 text-slate-400'}`}
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </Link>
      } />
      <Link href="/admin/colegas" className="inline-flex text-sm font-semibold text-orange-700 hover:underline">Acompanhar avaliações de colegas</Link>

      <div className="ui-filter-bar">
        <form className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="space-y-1.5 flex-1 max-w-xs">
            <label htmlFor="periodo" className="text-sm font-medium text-slate-700">Período</label>
            <select
              name="periodo"
              id="periodo"
              defaultValue={selectedPeriodId}
              className="ui-input"
            >
              <option value="">Selecione um período</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.status === 'OPEN' ? 'Aberto' : p.status === 'CLOSED' ? 'Encerrado' : 'Rascunho'})</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="ui-button ui-button-primary"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="ui-table-shell">
        {!selectedPeriodId ? (
          <EmptyState icon={FileText} title="Selecione um período" description="Escolha um período no filtro acima para ver os resultados." />
        ) : results.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum resultado" description="Ainda não há avaliações processadas para este período." />
        ) : (
          <div className="ui-table-mobile-cards overflow-x-auto">
            <table className="ui-table">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Liderança</th>
                  <th className="px-6 py-4">Setor</th>
                  <th className="px-6 py-4">Respostas da equipe</th>
                  <th className="px-6 py-4">Média da equipe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((result) => (
                  <tr key={result.managerId} className="hover:bg-slate-50/50">
                    <td data-label="Liderança" className="px-6 py-4">
                      <Link href={`/admin/relatorios/${result.managerId}?periodo=${encodeURIComponent(selectedPeriodId)}`} className="font-medium text-orange-700 hover:underline">{result.managerName}</Link>
                      <div className="text-xs text-slate-500">{result.position}</div>
                    </td>
                    <td data-label="Setor" className="px-6 py-4 text-slate-600">{result.departmentName || '—'}</td>
                    <td data-label="Respostas" className="px-6 py-4 text-slate-600">
                      {result.hasEnoughData ? result.teamEvaluationCount : <span className="text-slate-400" title={`Mínimo de ${settings.minEvaluationsForDisplay} avaliações para preservar o anonimato`}>Aguardando mínimo</span>}
                    </td>
                    <td data-label="Média" className="px-6 py-4">
                      {result.hasEnoughData ? (
                        <span className="font-semibold text-slate-900">{formatScore(result.teamOverallAverage)}</span>
                      ) : (
                        <span className="text-slate-400 text-xs" title={`A média será liberada após ${settings.minEvaluationsForDisplay} avaliações`}>Aguardando mínimo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
