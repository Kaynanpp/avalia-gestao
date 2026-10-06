'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle, User } from 'lucide-react';
import { StarRating } from '@/components/ui/star-rating';
import { cn } from '@/lib/utils';
import type { Criterion } from '@/types';

export interface EvaluationManager {
  id: string;
  name: string;
  departmentName?: string;
  departmentId: string;
  position: string;
}

interface EvaluationFormProps {
  managers: EvaluationManager[];
  criteria: Pick<Criterion, 'id' | 'name' | 'description' | 'order'>[];
  periodId: string;
  periodName: string;
  commentsEnabled: boolean;
  participationToken: string;
  initialManager?: EvaluationManager;
  onSuccess?: (managerId: string) => void;
  onBackToLeaders?: () => void;
}

type Step = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;

export function EvaluationForm({
  managers,
  criteria,
  periodId,
  periodName,
  commentsEnabled,
  participationToken,
  initialManager,
  onSuccess,
  onBackToLeaders,
}: EvaluationFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialManager ? 2 : 1);
  const [selectedManager, setSelectedManager] = useState<EvaluationManager | null>(initialManager || null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const departments = useMemo(() => Array.from(new Map(managers.map((manager) => [manager.departmentId, manager.departmentName || 'Setor'])).entries()).sort((a, b) => a[1].localeCompare(b[1], 'pt-BR')), [managers]);
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const visibleManagers = managers.filter((manager) => (!departmentId || manager.departmentId === departmentId) && normalized(`${manager.name} ${manager.position}`).includes(normalized(search)));

  const isStepComplete = (s: Step): boolean => {
    if (s === 1) return selectedManager !== null;
    if (s === 2) return criteria.every((c) => scores[c.id] !== undefined);
    if (s === 3) return true; // comment is optional
    return false;
  };

  const handleManagerSelect = (manager: EvaluationManager) => {
    if (manager.id !== selectedManager?.id) {
      setScores({});
      setComment('');
    }
    setSelectedManager(manager);
  };

  const handleScoreChange = (criterionId: string, score: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS && isStepComplete(step)) {
      setStep((s) => (s + 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (step === 2 && initialManager && onBackToLeaders) {
      onBackToLeaders();
      return;
    }
    if (step > 1) {
      setStep((s) => (s - 1) as Step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (submitting || !selectedManager || !isStepComplete(2)) return;

    setSubmitting(true);
    try {
      const answers = criteria.map((c) => ({
        criterionId: c.id,
        score: scores[c.id],
      }));

      const response = await fetch('/api/avaliacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          managerId: selectedManager.id,
          periodId,
          evaluationType: 'TEAM',
          answers,
          comment: comment.trim() || undefined,
          participationToken,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (onSuccess && selectedManager) onSuccess(selectedManager.id);
        else router.push('/sucesso');
      } else {
        toast.error(data.error || 'Erro ao enviar avaliação. Tente novamente.');
        setSubmitting(false);
      }
    } catch {
      toast.error('Erro de conexão. Verifique sua internet e tente novamente.');
      setSubmitting(false);
    }
  };

  const answeredCount = criteria.filter((c) => scores[c.id]).length;
  const progressPercent = criteria.length ? (answeredCount / criteria.length) * 100 : 0;

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Step Indicator */}
      <nav aria-label="Progresso do formulário" className="ui-card mb-6 p-4 sm:p-5">
        <ol className="flex items-center gap-0">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <li key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'step-dot',
                    step === s
                      ? 'step-dot-active'
                      : s < step
                      ? 'step-dot-completed'
                      : 'step-dot-upcoming'
                  )}
                  aria-current={step === s ? 'step' : undefined}
                  aria-label={`Passo ${s}${step > s ? ' (concluído)' : step === s ? ' (atual)' : ''}`}
                >
                  {s < step ? '✓' : s}
                </span>
              </div>
              {s < TOTAL_STEPS && (
                <div
                  className={cn('step-line mx-2', s < step ? 'step-line-completed' : '')}
                  aria-hidden="true"
                />
              )}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground sm:text-xs">
          <span>Liderança</span>
          <span>Critérios</span>
          <span>Comentário</span>
          <span>Revisão</span>
        </div>
      </nav>

      {/* Step 1: Select Manager */}
      {step === 1 && (
        <div className="animate-fade-in space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Qual liderança você deseja avaliar?
            </h2>
            <p className="text-muted-foreground text-sm">
              Selecione a pessoa que acompanha seu trabalho: gerente, coordenador, supervisor ou líder.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Setor
              <select value={departmentId} onChange={(event) => { setDepartmentId(event.target.value); setSelectedManager(null); }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3">
                <option value="">Todos os setores</option>
                {departments.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Buscar nome ou cargo
              <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setSelectedManager(null); }} placeholder="Digite para encontrar" className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3" />
            </label>
          </div>
          <p className="text-xs text-slate-500" aria-live="polite">{visibleManagers.length} lideranças encontradas</p>
          <div
            className="space-y-2 max-h-[400px] overflow-y-auto pr-1"
            role="group"
            aria-label="Selecionar liderança"
          >
            {visibleManagers.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-600">Nenhuma liderança encontrada. Tente outro nome ou setor.</p>}
            {visibleManagers.map((manager) => (
              <button
                key={manager.id}
                id={`manager-${manager.id}`}
                type="button"
                aria-pressed={selectedManager?.id === manager.id}
                onClick={() => handleManagerSelect(manager)}
                className={cn(
                  'w-full text-left px-4 py-4 rounded-xl border-2 transition-all duration-150',
                  'flex items-center gap-4',
                  selectedManager?.id === manager.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/40 hover:bg-primary/2'
                )}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                    selectedManager?.id === manager.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                  aria-hidden="true"
                >
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{manager.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {manager.position}
                    {manager.departmentName && ` · ${manager.departmentName}`}
                  </p>
                </div>
                {selectedManager?.id === manager.id && (
                  <CheckCircle2
                    className="w-5 h-5 text-primary ml-auto flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Criteria Ratings */}
      {step === 2 && (
        <div className="animate-fade-in space-y-5">
          <div className="ui-card p-5">
            <h2 className="text-xl font-bold text-foreground mb-1">
              Avalie os critérios
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Avaliando:{' '}
              <strong className="text-foreground">{selectedManager?.name}</strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{selectedManager?.position} · {periodName} · {criteria.length} critérios</p>
          </div>

          {/* Progress bar */}
          <div className="ui-card sticky top-[4.5rem] z-10 space-y-2 p-4">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{answeredCount} de {criteria.length} respondidos</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div
              className="h-2 bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={answeredCount}
              aria-valuemin={0}
              aria-valuemax={criteria.length}
              aria-label="Progresso das respostas"
            >
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-6">
            {criteria.map((criterion, index) => (
              <div
                key={criterion.id}
                className={cn(
                  'rounded-xl border p-4 transition-colors sm:p-5',
                  scores[criterion.id]
                    ? 'border-orange-300 bg-orange-50/40 dark:border-orange-900 dark:bg-orange-950/20'
                    : 'border-border bg-card'
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <label
                      htmlFor={`criterion-${criterion.id}`}
                      className="font-semibold text-foreground block"
                    >
                      {index + 1}. {criterion.name}
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {criterion.description}
                    </p>
                  </div>
                  {scores[criterion.id] && (
                    <CheckCircle2
                      className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <StarRating
                  value={scores[criterion.id] || 0}
                  onChange={(score) => handleScoreChange(criterion.id, score)}
                  label={criterion.name}
                  criterionId={criterion.id}
                  size="lg"
                  showLabel={true}
                />
              </div>
            ))}
          </div>

          {answeredCount < criteria.length && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 text-amber-700 text-sm"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              <span>
                Responda todos os {criteria.length} critérios para continuar.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Comment */}
      {step === 3 && (
        <div className="animate-fade-in space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Observações adicionais
            </h2>
            <p className="text-muted-foreground text-sm">
              Esta etapa é completamente opcional.
            </p>
          </div>

          {commentsEnabled ? <>
            <div className="ui-alert-info">
              <p>
                <strong>Seu comentário é opcional.</strong> Não informe dados que possam
                identificar você ou outros funcionários.
              </p>
            </div>

            <div>
            <label
              htmlFor="comment"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Comentário (opcional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 1000))}
              placeholder="O que essa liderança faz bem? O que poderia melhorar? Use exemplos sem identificar pessoas."
              rows={5}
              maxLength={1000}
              className="ui-input min-h-32 resize-y"
              aria-describedby="comment-hint comment-count"
            />
            <div className="flex justify-between mt-1">
              <p id="comment-hint" className="text-xs text-muted-foreground">
                Opcional · Máximo 1000 caracteres
              </p>
              <p
                id="comment-count"
                className={cn(
                  'text-xs',
                  comment.length > 900 ? 'text-amber-600' : 'text-muted-foreground'
                )}
                aria-live="polite"
              >
                {comment.length}/1000
              </p>
            </div>
            </div>
          </> : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              O envio de comentários está desativado para este ciclo.
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="animate-fade-in space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">
              Revise suas respostas
            </h2>
            <p className="text-muted-foreground text-sm">
              Confirme os dados antes de enviar. Após o envio, não é possível editar.
            </p>
          </div>

          {/* Manager */}
          <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-4 dark:border-orange-900 dark:bg-orange-950/20">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Liderança avaliada
            </p>
            <p className="font-semibold text-foreground">{selectedManager?.name}</p>
            <p className="text-sm text-muted-foreground">
              {selectedManager?.position}
              {selectedManager?.departmentName && ` · ${selectedManager.departmentName}`}
            </p>
          </div>

          {/* Scores */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Notas por critério
            </p>
            <div className="space-y-2">
              {criteria.map((criterion) => (
                <div
                  key={criterion.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <span className="text-sm text-foreground">{criterion.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span
                          key={s}
                          className={cn(
                            'text-base',
                            s <= scores[criterion.id]
                              ? 'text-amber-400'
                              : 'text-slate-200'
                          )}
                          aria-hidden="true"
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm font-medium text-foreground w-4">
                      {scores[criterion.id]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment */}
          {commentsEnabled && comment && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Comentário
              </p>
              <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
                {comment}
              </p>
            </div>
          )}

          {/* Anonymity notice */}
          <div className="ui-alert-success flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-emerald-800">Avaliação anônima</p>
              <p className="text-xs text-emerald-700 mt-0.5">
                Sua participação é validada separadamente. A resposta não contém seu nome, matrícula ou código de participação. O RH/DP poderá ler o comentário; evite detalhes que identifiquem você.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex items-center justify-between border-t border-border bg-slate-50/95 px-4 py-4 dark:bg-slate-950/95 sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pt-6 dark:sm:bg-transparent">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || submitting}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all',
            step === 1
              ? 'text-muted-foreground cursor-not-allowed opacity-50'
              : 'text-foreground hover:bg-muted'
          )}
          aria-label="Voltar ao passo anterior"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Voltar
        </button>

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepComplete(step)}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
              isStepComplete(step)
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
            aria-label={`Avançar para o passo ${step + 1}`}
          >
            Continuar
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            id="btn-enviar-avaliacao"
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
              'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25',
              submitting && 'opacity-75 cursor-not-allowed'
            )}
            aria-busy={submitting}
            aria-label="Enviar avaliação"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" aria-hidden="true" />
                Enviar Avaliação
              </>
            )}
          </button>
        )}
      </div>

      {/* Period info */}
      <p className="text-center text-xs text-muted-foreground mt-4">
        Período: <strong>{periodName}</strong>
      </p>
    </div>
  );
}
