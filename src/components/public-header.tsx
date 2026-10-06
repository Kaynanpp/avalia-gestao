import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export function PublicHeader({ title, context }: { title: string; context?: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" aria-label="Voltar à página inicial">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Início</span>
        </Link>
        <span className="h-5 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <BrandLogo className="w-20 sm:w-28" priority />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
          {context && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{context}</p>}
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
