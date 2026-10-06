'use client';

import { useCallback, useEffect, useState } from 'react';
import { Copy, KeyRound, LoaderCircle, Plus, ShieldCheck, Trash2, UserCheck, UserRoundX } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminUser, UserRole } from '@/types';
import { USER_ROLE_LABELS } from '@/lib/utils';

type CredentialNotice = { email: string; name: string; temporaryPassword: string; operation: 'created' | 'reset' };

export function UserManagementPage({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingUserId, setChangingUserId] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'RH' as UserRole });
  const [credentialNotice, setCredentialNotice] = useState<CredentialNotice | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/usuarios', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível carregar os usuários.');
      setUsers(data.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setCredentialNotice(null);
    try {
      const response = await fetch('/api/admin/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível criar o usuário.');
      setCredentialNotice({ ...data.data, temporaryPassword: data.temporaryPassword, operation: 'created' });
      setNewUser({ name: '', email: '', role: 'RH' });
      toast.success('Conta criada. Guarde a senha temporária agora.');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar o usuário.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    const nextActive = !user.active;
    const confirmation = nextActive
      ? `Reativar o acesso de ${user.name}?`
      : `Desativar o acesso de ${user.name}? A pessoa será desconectada e não poderá entrar novamente.`;
    if (!window.confirm(confirmation)) return;

    setChangingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível alterar o acesso.');
      toast.success(nextActive ? 'Acesso reativado.' : 'Acesso desativado.');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível alterar o acesso.');
    } finally {
      setChangingUserId(null);
    }
  };

  const deleteUser = async (user: AdminUser) => {
    if (user.id === currentUserId) {
      toast.error('Você não pode excluir sua própria conta.');
      return;
    }
    if (!window.confirm(`Excluir permanentemente a conta de ${user.name} (${user.email})? A pessoa perderá o acesso e esta ação não pode ser desfeita. O histórico administrativo será mantido.`)) return;

    setChangingUserId(user.id);
    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível excluir a conta.');
      toast.success('Conta excluída. O histórico de auditoria foi preservado.');
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível excluir a conta.');
    } finally {
      setChangingUserId(null);
    }
  };

  const resetPassword = async (user: AdminUser) => {
    if (user.id === currentUserId) return;
    if (!window.confirm(`Redefinir a senha de ${user.name}? As sessões existentes serão encerradas e a pessoa deverá escolher uma senha nova ao entrar.`)) return;

    setChangingUserId(user.id);
    setCredentialNotice(null);
    try {
      const response = await fetch(`/api/admin/usuarios/${user.id}/senha`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível redefinir a senha.');
      setCredentialNotice({ email: user.email, name: user.name, temporaryPassword: data.temporaryPassword, operation: 'reset' });
      toast.success('Senha redefinida. Guarde a senha temporária agora.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível redefinir a senha.');
    } finally {
      setChangingUserId(null);
    }
  };

  const copyTemporaryPassword = async () => {
    if (!credentialNotice) return;
    try {
      await navigator.clipboard.writeText(credentialNotice.temporaryPassword);
      toast.success('Senha copiada. Envie-a à pessoa por um canal privado.');
    } catch {
      toast.error('Selecione a senha exibida e copie manualmente.');
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-orange-600">Administração</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Usuários e acessos</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Cadastre contas de ADMIN e RH. Cada pessoa troca a senha temporária no primeiro acesso.</p>
        </div>
        <button onClick={() => { setCredentialNotice(null); setShowForm((value) => !value); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {showForm ? 'Fechar cadastro' : 'Adicionar usuário'}
        </button>
      </header>

      {showForm && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="font-semibold text-slate-900">Novo acesso</h2>
          <p className="mt-1 text-sm text-slate-500">A senha temporária será mostrada uma única vez após o cadastro.</p>
          <form onSubmit={createUser} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5"><label htmlFor="user-name" className="text-sm font-medium text-slate-700">Nome</label><input id="user-name" required minLength={2} maxLength={100} value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" /></div>
            <div className="space-y-1.5"><label htmlFor="user-email" className="text-sm font-medium text-slate-700">E-mail</label><input id="user-email" type="email" required autoComplete="off" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100" /></div>
            <div className="space-y-1.5"><label htmlFor="user-role" className="text-sm font-medium text-slate-700">Acesso</label><select id="user-role" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as UserRole })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"><option value="RH">RH/DP</option><option value="ADMIN">Administrador</option></select></div>
            <div className="flex items-end"><button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}{saving ? 'Criando...' : 'Criar conta'}</button></div>
          </form>
        </section>
      )}

      {credentialNotice && (
        <section role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><h2 className="font-semibold text-emerald-950">{credentialNotice.operation === 'created' ? 'Conta criada' : 'Senha redefinida'}: {credentialNotice.name}</h2><p className="mt-1 text-sm text-emerald-900">Envie a senha por um canal privado. A pessoa deverá escolher uma senha pessoal ao entrar.</p><p className="mt-3 text-sm"><strong>E-mail:</strong> {credentialNotice.email}</p><label htmlFor="temporary-password" className="mt-2 block text-sm font-medium text-emerald-950">Senha temporária</label><input id="temporary-password" readOnly value={credentialNotice.temporaryPassword} onFocus={(event) => event.currentTarget.select()} className="mt-1 w-full select-all rounded-md border border-emerald-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 sm:max-w-lg" /></div>
            <button onClick={copyTemporaryPassword} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-100"><Copy className="h-4 w-4" aria-hidden="true" />Copiar senha</button>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold text-slate-900">Contas cadastradas</h2><p className="mt-0.5 text-xs text-slate-500">Desativar preserva a conta. Excluir remove o login e mantém o registro de auditoria.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{users.length} usuários</span></div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Carregando usuários...</div> : users.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Nenhuma conta cadastrada.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Pessoa</th><th className="px-5 py-3">Acesso</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Último acesso</th><th className="px-5 py-3 text-right">Ações</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{user.name}</p><p className="mt-0.5 text-xs text-slate-500">{user.email}</p>{user.mustChangePassword && <p className="mt-1 text-xs text-amber-700">Senha temporária ainda não trocada</p>}</td>
                    <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{USER_ROLE_LABELS[user.role]}</span></td>
                    <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{user.active ? 'Ativo' : 'Desativado'}</span></td>
                    <td className="px-5 py-4 text-xs text-slate-500">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Ainda não entrou'}</td>
                    <td className="px-5 py-4 text-right">
                      {user.id === currentUserId ? <span className="text-xs text-slate-400">Sua conta</span> : (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button onClick={() => void toggleActive(user)} disabled={changingUserId === user.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium disabled:opacity-50 ${user.active ? 'border-red-200 text-red-700 hover:bg-red-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                            {changingUserId === user.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : user.active ? <UserRoundX className="h-3.5 w-3.5" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                            {user.active ? 'Desativar' : 'Reativar'}
                          </button>
                          <button onClick={() => void resetPassword(user)} disabled={changingUserId === user.id} title="Redefinir senha" className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-3 py-2 text-xs font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"><KeyRound className="h-3.5 w-3.5" aria-hidden="true" />Senha</button>
                          <button onClick={() => void deleteUser(user)} disabled={changingUserId === user.id} title="Excluir conta permanentemente" className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Excluir</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
