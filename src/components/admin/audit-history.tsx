'use client';

import { useState } from 'react';
import { formatDateTime } from '@/lib/utils';

type Entry = { id: string; description: string; actor: string; entity: string; createdAt: string };
export function AuditHistory({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState('');
  const normalized = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filtered = entries.filter((entry) => normalized(`${entry.description} ${entry.actor}`).includes(normalized(query)));
  return <div className="mx-auto max-w-5xl space-y-6">
    <header><h1 className="text-2xl font-bold text-slate-900">Histórico administrativo</h1><p className="mt-2 text-sm text-slate-600">Últimas 200 ações em cadastros, acessos e períodos. As avaliações não identificam quem respondeu.</p></header>
    <label className="block text-sm font-medium">Buscar ação ou responsável<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3" placeholder="Ex.: período, cadastro, nome do administrador" /></label>
    <p className="text-sm text-slate-500" aria-live="polite">{filtered.length} registros neste recorte</p>
    <ol className="divide-y rounded-xl border border-slate-200 bg-white">
      {filtered.map((entry) => <li key={entry.id} className="p-5"><p className="text-sm font-medium text-slate-900">{entry.description}</p><p className="mt-2 text-xs text-slate-500">{entry.actor} · {formatDateTime(entry.createdAt)}</p></li>)}
      {!filtered.length && <li className="p-10 text-center text-sm text-slate-500">Nenhum registro encontrado.</li>}
    </ol>
  </div>;
}
