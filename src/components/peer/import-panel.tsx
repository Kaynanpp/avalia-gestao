'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from 'lucide-react';
import { toast } from 'sonner';
import type { PeerDepartment, PeerImportRow } from '@/lib/peer/types';
import { buttonClass, fieldClass, peerApi, secondaryClass } from './shared';

export function PeerImportPanel({ onImported, departments }: { onImported: () => Promise<void>; departments: PeerDepartment[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PeerImportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const errors = rows.filter((row) => row.error).length;
  const valid = rows.length - errors;

  async function process(preview: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      let result: { rows: PeerImportRow[]; imported: number };
      if (file) {
        const form = new FormData();
        form.set('file', file);
        form.set('preview', String(preview));
        const response = await fetch('/api/admin/colegas/importar', { method: 'POST', body: form });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Não foi possível processar o arquivo.');
        result = payload.data;
      } else {
        result = await peerApi('/api/admin/colegas/importar', 'POST', { text, preview });
      }
      setRows(result.rows);
      if (!preview) {
        toast.success(`${result.imported} colaboradores importados.`);
        setFile(null); setText(''); setRows([]);
        await onImported();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível importar.');
      if (!preview) setRows([]);
    } finally { setBusy(false); }
  }

  function chooseFile(selected: File | undefined) {
    if (!selected) return;
    const lower = selected.name.toLocaleLowerCase('pt-BR');
    if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) { toast.error('Selecione um arquivo .xlsx ou .csv.'); return; }
    if (selected.size > 2_000_000) { toast.error('Use um arquivo de até 2 MB.'); return; }
    setFile(selected); setText(''); setRows([]);
  }

  return (
    <section className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <p className="text-sm font-semibold text-orange-600">Importação em massa</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Importar colaboradores</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Baixe o modelo, preencha nome, matrícula, setor e cargo/função e envie o arquivo. Primeiro será exibida uma prévia; nenhum cadastro é criado enquanto existir uma linha inválida.</p>
      </div>

      <ol className="grid gap-3 text-sm sm:grid-cols-3">
        <li className="rounded-lg bg-slate-50 p-4"><strong className="block text-slate-900">1. Baixe o modelo</strong><span className="mt-1 block text-slate-500">Já contém as colunas e orientações.</span></li>
        <li className="rounded-lg bg-slate-50 p-4"><strong className="block text-slate-900">2. Preencha e envie</strong><span className="mt-1 block text-slate-500">Até 500 pessoas por arquivo.</span></li>
        <li className="rounded-lg bg-slate-50 p-4"><strong className="block text-slate-900">3. Confira a prévia</strong><span className="mt-1 block text-slate-500">Corrija erros antes de confirmar.</span></li>
      </ol>

      <div className="flex flex-wrap gap-3">
        <Link href="/api/admin/colegas/modelo" prefetch={false} className={secondaryClass}><Download className="mr-2 inline h-4 w-4" />Baixar modelo Excel</Link>
        <label className={`${buttonClass} cursor-pointer`}><Upload className="mr-2 inline h-4 w-4" />Selecionar arquivo<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="sr-only" disabled={busy} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ''; }} /></label>
      </div>

      {file && <div className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><FileSpreadsheet className="h-7 w-7 text-orange-700" /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{file.name}</p><p className="text-xs text-slate-500">{Math.ceil(file.size / 1024)} KB · pronto para validar</p></div><button type="button" onClick={() => { setFile(null); setRows([]); }} className="ml-auto text-sm font-medium text-orange-800">Remover</button></div>}

      <details className="rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Ou colar dados em formato CSV</summary>
        <label htmlFor="peer-import" className="mt-4 block text-sm text-slate-600">Use: nome;matrícula;setor;cargo/função</label>
        <textarea id="peer-import" value={text} disabled={busy || Boolean(file)} onChange={(event) => { setText(event.target.value); setRows([]); }} maxLength={650000} rows={7} className={`${fieldClass} mt-2 font-mono`} placeholder={'Nome;Matrícula;Setor;Cargo/Função\nMaria Silva;00125;Produção;Auxiliar de produção'} />
      </details>

      <button className={buttonClass} onClick={() => void process(true)} disabled={busy || (!file && !text.trim())}>{busy ? 'Validando...' : 'Validar e visualizar prévia'}</button>

      {rows.length > 0 && <div className="space-y-4">
        <div role="status" className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-2 ${errors ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />{valid} registros válidos</p>
          <p className={`flex items-center gap-2 text-sm font-semibold ${errors ? 'text-red-800' : 'text-slate-600'}`}><AlertTriangle className="h-5 w-5" />{errors} registros com problemas</p>
        </div>
        <div className="max-h-[30rem] overflow-auto rounded-lg border">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Linha</th><th className="p-3">Nome</th><th className="p-3">Matrícula</th><th className="p-3">Setor</th><th className="p-3">Cargo/Função</th><th className="p-3">Validação</th></tr></thead>
            <tbody className="divide-y">{rows.map((row) => <tr key={row.line} className={row.error ? 'bg-red-50' : ''}><td className="p-3">{row.line}</td><td className="p-3">{row.name || '—'}</td><td className="p-3 font-mono text-xs">{row.registration || '—'}</td><td className="p-3">{row.departmentName || '—'}</td><td className="p-3">{row.position || '—'}</td><td className={`p-3 text-xs ${row.error ? 'font-medium text-red-700' : 'text-emerald-700'}`}>{row.error ? `Linha ${row.line} — ${row.error}` : 'Pronto'}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3"><button disabled={busy || errors > 0 || valid === 0} onClick={() => void process(false)} className={buttonClass}>{busy ? 'Importando...' : `Confirmar importação de ${valid} colaboradores`}</button>{errors > 0 && <p className="text-sm text-amber-800">Corrija o arquivo e valide novamente. Nenhum registro foi importado.</p>}</div>
      </div>}

      {!departments.some((department) => department.active) && <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Cadastre ao menos um setor ativo antes de importar.</p>}
    </section>
  );
}
