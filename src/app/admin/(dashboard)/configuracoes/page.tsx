'use client';

import { useEffect, useState } from 'react';
import { Settings2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCT } from '@/lib/product';

type SettingsForm = {
  companyName: string;
  appName: string;
  minEvaluationsForDisplay: number;
  commentsEnabled: boolean;
};

const DEFAULT_SETTINGS: SettingsForm = {
  companyName: '',
  appName: PRODUCT.name,
  minEvaluationsForDisplay: 5,
  commentsEnabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/configuracoes')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao carregar configurações');
        if (active) setSettings({ ...DEFAULT_SETTINGS, ...data.data });
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Erro ao carregar configurações'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível salvar as configurações');
      setSettings({ ...DEFAULT_SETTINGS, ...data.data });
      toast.success('Configurações salvas');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm font-medium text-orange-600">Administração</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Configurações</h1>
        <p className="mt-1 text-slate-500">Defina a identificação do sistema e as regras de privacidade dos resultados.</p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando configurações...</div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><Settings2 className="h-5 w-5" aria-hidden="true" /></span>
              <div><h2 className="font-semibold text-slate-900">Identificação</h2><p className="text-sm text-slate-500">Personalize os nomes exibidos pelo sistema.</p></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><label htmlFor="companyName" className="text-sm font-medium text-slate-700">Nome da empresa</label><input id="companyName" required maxLength={100} value={settings.companyName} onChange={(event) => setSettings({ ...settings, companyName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" /></div>
              <div className="space-y-1.5"><label htmlFor="appName" className="text-sm font-medium text-slate-700">Nome do sistema</label><input id="appName" required maxLength={100} value={settings.appName} onChange={(event) => setSettings({ ...settings, appName: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" /></div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
              <div><h2 className="font-semibold text-slate-900">Privacidade e participação</h2><p className="text-sm text-slate-500">Controle quando os resultados de equipe podem ser exibidos.</p></div>
            </div>
            <div className="space-y-5">
              <div className="max-w-xs space-y-1.5"><label htmlFor="minEvaluationsForDisplay" className="text-sm font-medium text-slate-700">Mínimo de avaliações por pessoa</label><input id="minEvaluationsForDisplay" type="number" required min={1} max={50} value={settings.minEvaluationsForDisplay} onChange={(event) => setSettings({ ...settings, minEvaluationsForDisplay: Number(event.target.value) })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" /><p className="text-xs leading-relaxed text-slate-500">Médias, quantidades e comentários ficam ocultos até atingir esse limite.</p></div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-4">
                <input type="checkbox" checked={settings.commentsEnabled} onChange={(event) => setSettings({ ...settings, commentsEnabled: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500" />
                <span><span className="block text-sm font-medium text-slate-800">Permitir comentários nas avaliações</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">Quando desativado, comentários não são aceitos nem salvos.</span></span>
              </label>
            </div>
          </section>

          <div className="flex justify-end"><button type="submit" disabled={saving} className="rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar configurações'}</button></div>
        </form>
      )}
    </div>
  );
}
