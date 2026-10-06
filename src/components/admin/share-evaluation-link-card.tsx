'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function ShareEvaluationLinkCard({ hasOpenPeriod }: { hasOpenPeriod: boolean }) {
  const [url, setUrl] = useState('');
  const [peerUrl, setPeerUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(new URL('/avaliar', window.location.origin).toString());
    setPeerUrl(new URL('/avaliar-colega', window.location.origin).toString());
  }, []);

  const copyLink = async (value = url) => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        // Clipboard API is unavailable on the Raspberry's internal HTTP address.
        const field = document.createElement('textarea');
        field.value = value;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const didCopy = document.execCommand('copy');
        field.remove();
        if (!didCopy) throw new Error('Copy unavailable');
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      toast.error('Selecione e copie o endereço exibido abaixo. O navegador não permitiu a cópia automática.');
    }
  };

  return (
    <section className="rounded-xl border border-orange-100 bg-orange-50/70 p-5 sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div>
        <h2 className="font-semibold text-orange-950">Acessos para a equipe</h2>
        <p className="mt-1 max-w-2xl text-sm text-orange-900">Use o endereço de lideranças para a avaliação anônima geral. No endereço de colegas, cada colaborador informa a matrícula e vê somente pessoas do próprio setor.</p>
        {url && <div className="mt-3 grid gap-2"><label className="text-xs font-medium text-orange-950">Lideranças<input aria-label="Link público para avaliar lideranças" readOnly value={url} onFocus={(event) => event.target.select()} className="mt-1 w-full rounded-md border border-orange-200 bg-white px-3 py-2 font-mono text-xs text-orange-800" /></label><label className="text-xs font-medium text-orange-950">Colegas<input aria-label="Link público para avaliar colegas" readOnly value={peerUrl} onFocus={(event) => event.target.select()} className="mt-1 w-full rounded-md border border-orange-200 bg-white px-3 py-2 font-mono text-xs text-orange-800" /></label></div>}
        {!hasOpenPeriod && <p className="mt-2 text-xs font-medium text-amber-800">Conclua a preparação acima e abra um período antes de divulgar o formulário.</p>}
      </div>
      <div className="mt-4 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        <button onClick={() => void copyLink(url)} disabled={!url} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50">
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
        <button onClick={() => void copyLink(peerUrl)} disabled={!peerUrl} className="inline-flex items-center gap-2 rounded-lg border border-orange-300 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900"><Copy className="h-4 w-4" />Copiar colegas</button>
        <Link href="/avaliar" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-900 hover:bg-orange-100">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Abrir formulário
        </Link>
      </div>
    </section>
  );
}
