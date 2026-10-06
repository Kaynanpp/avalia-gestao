'use client';

import { PRODUCT } from '@/lib/product';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface ChangePasswordFormProps {
  email: string;
  required: boolean;
}

export function ChangePasswordForm({ email, required }: ChangePasswordFormProps) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmation) {
      toast.error('As novas senhas não conferem.');
      return;
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      toast.error('Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/conta/senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Não foi possível trocar a senha.');
      }

      toast.success('Senha atualizada. Entre novamente com sua nova senha.');
      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message = code === 'auth/invalid-credential' || code === 'auth/wrong-password'
        ? 'A senha atual está incorreta.'
        : error instanceof Error ? error.message : 'Não foi possível trocar a senha.';
      toast.error(message);
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-xl">
        <Link href="/admin" className="text-sm font-medium text-orange-700 hover:text-orange-900">{PRODUCT.name}</Link>
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><KeyRound className="h-6 w-6" aria-hidden="true" /></div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Trocar senha</h1>
          <p className="mt-2 text-sm text-slate-600">Conta: <strong>{email}</strong></p>

          {required && (
            <div role="alert" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Esta é uma senha temporária. Crie sua senha pessoal para continuar usando o painel.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="current-password" className="mb-1.5 block text-sm font-medium text-slate-700">Senha atual</label>
              <input id="current-password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700">Nova senha</label>
              <input id="new-password" type="password" autoComplete="new-password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
              <p className="mt-1.5 text-xs text-slate-500">Mínimo de 8 caracteres, com maiúscula, minúscula, número e símbolo.</p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700">Confirme a nova senha</label>
              <input id="confirm-password" type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" />
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>Para proteger sua conta, confirmamos sua senha atual. Depois da troca, você precisará entrar novamente.</span>
            </div>
            <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {saving ? 'Atualizando...' : 'Atualizar senha'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
