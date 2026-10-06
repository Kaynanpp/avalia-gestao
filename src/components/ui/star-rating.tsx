'use client';

import { useState, useCallback, useId } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCORE_LABELS } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  criterionId: string;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabel?: boolean;
  className?: string;
}

const STAR_SIZES = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10 sm:w-12 sm:h-12',
};

export function StarRating({
  value,
  onChange,
  label,
  criterionId,
  size = 'lg',
  readonly = false,
  showLabel = true,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number>(0);
  const groupId = useId();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, starValue: number) => {
      if (readonly) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(starValue);
      }
      if (e.key === 'ArrowRight' && starValue < 5) {
        e.preventDefault();
        onChange(starValue + 1);
      }
      if (e.key === 'ArrowLeft' && starValue > 1) {
        e.preventDefault();
        onChange(starValue - 1);
      }
    },
    [onChange, readonly]
  );

  const activeValue = hovered || value;

  return (
    <div className={cn('space-y-2', className)}>
      <fieldset className="border-0 p-0 m-0">
        <legend className="sr-only">{label}: selecione uma nota de 1 a 5 estrelas</legend>
        <div
          className="grid grid-cols-5 gap-1.5 sm:gap-2"
          role="group"
          aria-label={`Nota para ${label}`}
          onMouseLeave={() => !readonly && setHovered(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const isActive = star <= activeValue;
            const isCurrentValue = star === value;
            const inputId = `${groupId}-star-${star}`;

            return (
              <label
                key={star}
                htmlFor={inputId}
                className={cn(
                  'relative flex min-h-[4.75rem] flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors',
                  readonly ? 'cursor-default' : 'cursor-pointer',
                  isCurrentValue
                    ? 'border-orange-600 bg-orange-50 text-orange-900 ring-1 ring-orange-600 dark:bg-orange-950/40 dark:text-orange-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:bg-orange-50/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-orange-700'
                )}
                onMouseEnter={() => !readonly && setHovered(star)}
                title={SCORE_LABELS[star]}
              >
                <input
                  id={inputId}
                  type="radio"
                  name={`star-rating-${criterionId}`}
                  value={star}
                  checked={isCurrentValue}
                  onChange={() => !readonly && onChange(star)}
                  onKeyDown={(e) => handleKeyDown(e, star)}
                  className="sr-only"
                  aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'} - ${SCORE_LABELS[star]}`}
                  disabled={readonly}
                  tabIndex={value === star || (value === 0 && star === 1) ? 0 : -1}
                />
                <Star
                  className={cn(
                    size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-5 w-5' : 'h-5 w-5 sm:h-6 sm:w-6',
                    'transition-colors duration-100',
                    isActive
                      ? 'fill-orange-500 text-orange-500'
                      : 'fill-transparent text-slate-300',
                  )}
                  aria-hidden="true"
                />
                <span className="mt-1 text-sm font-bold tabular-nums">{star}</span>
                <span className="mt-0.5 text-[9px] leading-tight sm:text-[11px]">{SCORE_LABELS[star]}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Score label */}
      {showLabel && (
        <p
          className={cn(
            'text-xs font-medium transition-all duration-200 min-h-[1.25rem]',
            activeValue > 0 ? 'opacity-100' : 'opacity-0'
          )}
          aria-live="polite"
          aria-atomic="true"
        >
          {activeValue > 0 && (
            <span
              className={cn(
                activeValue >= 5
                  ? 'text-emerald-600'
                  : activeValue >= 4
                  ? 'text-green-600'
                  : activeValue >= 3
                  ? 'text-yellow-600'
                  : activeValue >= 2
                  ? 'text-orange-600'
                  : 'text-red-600'
              )}
            >
              {activeValue} {activeValue === 1 ? 'estrela' : 'estrelas'} —{' '}
              {SCORE_LABELS[activeValue]}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

// Read-only star display component
interface StarDisplayProps {
  value: number | null;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

export function StarDisplay({ value, size = 'sm', showNumber = true, className }: StarDisplayProps) {
  if (value === null) {
    return (
      <span className="text-muted-foreground text-sm" aria-label="Sem avaliação">
        —
      </span>
    );
  }

  const filled = Math.floor(value);
  const hasHalf = value % 1 >= 0.5;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex gap-0.5" aria-label={`${value} estrelas`} role="img">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              STAR_SIZES[size],
              star <= filled
                ? 'fill-amber-400 text-amber-400'
                : star === filled + 1 && hasHalf
                ? 'fill-amber-200 text-amber-300'
                : 'fill-transparent text-slate-200'
            )}
            aria-hidden="true"
          />
        ))}
      </div>
      {showNumber && (
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
