'use client';

import { Printer } from 'lucide-react';

export function PrintReportButton() {
  return <button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Printer className="h-4 w-4" />Imprimir ou salvar em PDF</button>;
}
