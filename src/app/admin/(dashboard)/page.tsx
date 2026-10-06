import Link from 'next/link';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Circle, ClipboardCheck, ClipboardList, Lightbulb, Star, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { getDashboardStats, getSettings } from '@/lib/services/reports.service';
import { getDepartments } from '@/lib/services/departments.service';
import { getActiveCriteria } from '@/lib/services/criteria.service';
import { getDevelopmentPlans } from '@/lib/services/development-plans.service';
import { formatDate, formatScore } from '@/lib/utils';
import { ShareEvaluationLinkCard } from '@/components/admin/share-evaluation-link-card';
import { PageHeader, StatusBadge } from '@/components/ui/product-ui';

export default async function DashboardPage() {
  const settingsPromise = getSettings();
  const statsPromise = settingsPromise.then((settings) => getDashboardStats(settings.minEvaluationsForDisplay));
  const [settings, departments, criteria, plans, stats] = await Promise.all([
    settingsPromise,
    getDepartments(),
    getActiveCriteria(),
    getDevelopmentPlans(),
    statsPromise,
  ]);
  const readiness = [
    { label: 'Setores ativos', ready: departments.some((department) => department.active), href: '/admin/setores', action: 'Cadastrar setores' },
    { label: 'Lideranças ativas', ready: stats.activeManagers > 0, href: '/admin/liderancas', action: 'Cadastrar lideranças' },
    { label: 'Colaboradores cadastrados', ready: stats.totalCoworkers > 0, href: '/admin/colegas', action: 'Cadastrar ou importar' },
    { label: 'Critérios ativos', ready: criteria.length > 0, href: '/admin/criterios', action: 'Definir critérios' },
    { label: 'Ciclo aberto', ready: Boolean(stats.currentPeriod), href: '/admin/periodos', action: 'Abrir ciclo' },
  ];
  const isReady = readiness.every((item) => item.ready);
  const openPlans = plans.filter((plan) => plan.status === 'PLANNED' || plan.status === 'IN_PROGRESS');

  return <div className="ui-page">
    <PageHeader eyebrow="Visão executiva" title="Painel do ciclo" description="Acompanhe a participação, os resultados já liberados e as ações que exigem atenção." />

    {stats.currentPeriod ? <section className="ui-card overflow-hidden"><div className="h-1 bg-orange-600" /><div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><StatusBadge tone="success">Ciclo aberto</StatusBadge><h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">{stats.currentPeriod.name}</h2><p className="mt-1 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CalendarDays className="h-4 w-4" />{formatDate(stats.currentPeriod.startDate)} até {formatDate(stats.currentPeriod.endDate)}</p></div><Link href="/admin/periodos" className="ui-button-secondary self-start sm:self-center">Gerenciar ciclo<ArrowRight className="h-4 w-4" /></Link></div></section> : <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-700" /><div><h2 className="font-semibold text-amber-950 dark:text-amber-100">Nenhum ciclo aberto</h2><p className="mt-1 text-sm text-amber-900 dark:text-amber-200">Abra um período para receber avaliações e acompanhar participação.</p><Link href="/admin/periodos" className="mt-3 inline-flex text-sm font-semibold text-amber-950 underline dark:text-amber-100">Planejar ou abrir ciclo</Link></div></div></section>}

    <section aria-label="Indicadores do ciclo" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric primary label="Participação em lideranças" value={stats.leadershipParticipationPercent === null ? '—' : `${stats.leadershipParticipationPercent}%`} detail={`${stats.leadershipParticipants} participantes · ${stats.currentPeriodTeamEvaluations} avaliações válidas`} />
      <Metric primary label="Participação entre colegas" value={stats.participationPercent === null ? '—' : `${stats.participationPercent}%`} detail={`${stats.peerParticipants} de ${stats.totalCoworkers} colaboradores participaram`} />
      <Metric label="Avaliações entre colegas" value={String(stats.peerEvaluations)} detail="Respostas válidas no ciclo atual" />
      <Metric label="Média geral liberada" value={formatScore(stats.teamOverallAverage)} detail={stats.teamOverallAverage === null ? `Protegida até ${settings.minEvaluationsForDisplay} respostas por liderança` : variation(stats.averageVariation)} />
    </section>

    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="ui-card p-5"><div className="flex items-center gap-3"><Lightbulb className="h-6 w-6 text-orange-600" /><div><h2 className="font-semibold text-slate-900 dark:text-white">Insights do ciclo</h2><p className="text-sm text-slate-500">Conclusões calculadas somente com resultados liberados.</p></div></div>{stats.insights.length ? <ul className="mt-5 space-y-3">{stats.insights.map((insight) => <li key={insight} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"><Circle className="mt-2 h-2 w-2 shrink-0 fill-orange-500 text-orange-500" />{insight}</li>)}</ul> : <p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/60">Ainda não há dados suficientes para gerar insights com segurança.</p>}{stats.strongestCriterion && stats.attentionCriterion && <div className="mt-4 grid gap-3 sm:grid-cols-2"><InsightMetric icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Maior média" name={stats.strongestCriterion.name} value={stats.strongestCriterion.average} /><InsightMetric icon={<TrendingDown className="h-4 w-4 text-amber-600" />} label="Ponto de atenção" name={stats.attentionCriterion.name} value={stats.attentionCriterion.average} /></div>}</section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Planos de desenvolvimento</h2><p className="text-sm text-slate-500">Ações abertas para acompanhamento.</p></div><ClipboardList className="h-6 w-6 text-orange-600" /></div><p className="mt-5 text-3xl font-bold text-slate-900">{openPlans.length}</p><p className="mt-1 text-sm text-slate-500">{plans.filter((plan) => plan.status === 'IN_PROGRESS').length} em andamento · {plans.filter((plan) => plan.status === 'COMPLETED').length} concluídos</p><Link href="/admin/desenvolvimento" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange-700">Acompanhar planos<ArrowRight className="h-4 w-4" /></Link></section>
    </div>

    <section className="ui-card p-5" aria-label="Preparação do ciclo"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{isReady ? 'Estrutura pronta para o ciclo' : 'Preparação do ciclo'}</h2><p className="mt-1 text-sm text-slate-500">Confira os cadastros necessários antes de abrir as avaliações.</p></div><span className="ui-status ui-status-neutral">{readiness.filter((item) => item.ready).length} de {readiness.length} etapas</span></div><ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{readiness.map((item) => <li key={item.href}><Link href={item.href} className="flex h-full items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:border-orange-300 hover:bg-orange-50/30 dark:border-slate-700 dark:hover:bg-orange-950/20">{item.ready ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-amber-500" />}<span className="flex-1 text-sm"><span className="block font-medium text-slate-700">{item.label}</span><span className="text-xs text-slate-500">{item.ready ? 'Concluído' : item.action}</span></span></Link></li>)}</ol></section>

    <ShareEvaluationLinkCard hasOpenPeriod={Boolean(stats.currentPeriod)} />

    <section className="grid gap-4 sm:grid-cols-3"><QuickLink href="/admin/relatorios" icon={<Star className="h-5 w-5" />} title="Analisar resultados" text="Compare ciclos, critérios, setores e lideranças." /><QuickLink href="/admin/colegas" icon={<Users className="h-5 w-5" />} title="Acompanhar participação" text="Veja quem concluiu sem acessar autoria das respostas." /><QuickLink href="/admin/desenvolvimento" icon={<ClipboardCheck className="h-5 w-5" />} title="Criar plano de ação" text="Transforme resultados em ações com prazo e responsável." /></section>
  </div>;
}

function variation(value: number | null) { if (value === null) return 'Sem ciclo anterior comparável'; if (Math.abs(value) < 0.05) return 'Estável em relação ao ciclo anterior'; return `${value > 0 ? '+' : ''}${value.toFixed(2)} em relação ao ciclo anterior`; }
function Metric({ label, value, detail, primary = false }: { label: string; value: string; detail: string; primary?: boolean }) { return <div className={`ui-card p-5 ${primary ? 'border-orange-200 dark:border-orange-900' : ''}`}><p className="text-sm font-medium text-slate-500">{label}</p><p className={`mt-2 font-bold tabular-nums text-slate-950 dark:text-white ${primary ? 'text-3xl' : 'text-2xl'}`}>{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div>; }
function InsightMetric({ icon, label, name, value }: { icon: React.ReactNode; label: string; name: string; value: number }) { return <div className="rounded-lg border p-3"><p className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{name}</p><p className="text-xs text-slate-500">Média {value.toFixed(2)}</p></div>; }
function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) { return <Link href={href} className="rounded-xl border bg-white p-5 transition-colors hover:border-orange-300"><span className="text-orange-600">{icon}</span><h2 className="mt-3 font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></Link>; }
