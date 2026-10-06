'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Department } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '@/components/ui/product-ui';

export default function SetoresPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/setores');
      const data = await res.json();
      if (data.success) {
        setDepartments(data.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar setores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(editingDepartment ? `/api/setores/${editingDepartment.id}` : '/api/setores', {
        method: editingDepartment ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(editingDepartment ? 'Setor atualizado' : 'Setor criado com sucesso');
        setIsCreateOpen(false);
        setEditingDepartment(null);
        setFormData({ name: '' });
        fetchDepartments();
      } else {
        toast.error(data.error || 'Erro ao criar setor');
      }
    } catch (error) {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDepartmentStatus = async (department: Department) => {
    const active = !department.active;
    if (!active && !window.confirm(`Desativar o setor "${department.name}"? Lideranças e relatórios históricos serão mantidos.`)) return;
    try {
      const response = await fetch(`/api/setores/${department.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar setor');
      toast.success(`Setor ${active ? 'ativado' : 'desativado'}`);
      fetchDepartments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desativar setor');
    }
  };

  return (
    <div className="ui-page">
      <PageHeader eyebrow="Estrutura" title="Setores" description="Organize os setores usados nos cadastros e nas avaliações." actions={
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setEditingDepartment(null); }}>
            <button onClick={() => { setEditingDepartment(null); setFormData({ name: '' }); setIsCreateOpen(true); }} className="ui-button ui-button-primary">
              <Plus className="w-4 h-4" />
              Novo Setor
            </button>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingDepartment ? 'Editar Setor' : 'Criar Novo Setor'}</DialogTitle>
                <DialogDescription>
                  {editingDepartment ? 'Atualize o nome do setor.' : 'Adicione um novo setor para associar às lideranças e aos colegas.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="ui-label">Nome do setor</label>
                  <input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({name: e.target.value})}
                    placeholder="Ex: Produção"
                    className="ui-input"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="ui-button ui-button-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="ui-button ui-button-primary"
                >
                  {submitting ? 'Salvando...' : editingDepartment ? 'Salvar alterações' : 'Salvar Setor'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="ui-table-shell">
        {loading ? (
          <LoadingState label="Carregando setores" />
        ) : departments.length === 0 ? (
          <EmptyState icon={Building2} title="Nenhum setor cadastrado" description="Crie o primeiro setor para organizar as lideranças e os colegas." />
        ) : (
          <div className="ui-table-mobile-cards overflow-x-auto">
            <table className="ui-table">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Nome do Setor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {departments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/50">
                    <td data-label="Setor" className="px-6 py-4 font-medium text-slate-900">{dept.name}</td>
                    <td data-label="Status" className="px-6 py-4"><StatusBadge tone={dept.active ? 'success' : 'neutral'}>{dept.active ? 'Ativo' : 'Inativo'}</StatusBadge></td>
                    <td data-label="Ações" className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingDepartment(dept); setFormData({ name: dept.name }); setIsCreateOpen(true); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md" title="Editar" aria-label={`Editar ${dept.name}`}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleDepartmentStatus(dept)} className={`rounded-md p-2 ${dept.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'}`} title={dept.active ? 'Desativar' : 'Ativar'} aria-label={`${dept.active ? 'Desativar' : 'Ativar'} ${dept.name}`}>{dept.active ? <Trash2 className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
