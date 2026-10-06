import type { LucideIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PageHeader({ eyebrow, title, description, actions }: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="ui-page-header">
      <div>
        {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
        <h1 className="ui-title">{title}</h1>
        {description && <p className="ui-description">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('ui-empty', className)}>
      <span className="ui-empty-icon"><Icon className="h-6 w-6" aria-hidden="true" /></span>
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Carregando informações...' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="ui-card flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-slate-500">
      <Loader2 className="h-5 w-5 animate-spin text-orange-600" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

const statusTone = {
  success: 'ui-status-success', neutral: 'ui-status-neutral', warning: 'ui-status-warning', danger: 'ui-status-danger',
} as const;

export function StatusBadge({ children, tone = 'neutral', dot = true }: {
  children: React.ReactNode;
  tone?: keyof typeof statusTone;
  dot?: boolean;
}) {
  return <span className={statusTone[tone]}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}{children}</span>;
}
