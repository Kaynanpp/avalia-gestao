'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, ListTodo, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { Criterion } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState, LoadingState, PageHeader, StatusBadge } from '@/components/ui/product-ui';

export default function CriteriosPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', modality: 'LEADERSHIP' as Criterion['modality'] });
  const [submitting, setSubmitting] = useState(false);

  const fetchCriteria = async () => {
    try {
      const res = await fetch('/api/criterios');
      const data = await res.json();
      if (data.success) {
        setCriteria(data.data);
      }
    } catch (error) {
      toast.error('Erro ao carregar critérios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriteria();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(editingCriterion ? `/api/criterios/${editingCriterion.id}` : '/api/criterios', {
        method: editingCriterion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCriterion
          ? formData
          : { ...formData, order: Math.max(0, ...criteria.map((criterion) => criterion.order)) + 1 }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(editingCriterion ? 'Critério atualizado' : 'Critério criado com sucesso');
        setIsCreateOpen(false);
        setEditingCriterion(null);
        setFormData({ name: '', description: '', modality: 'LEADERSHIP' });
        fetchCriteria();
      } else {
        toast.error(data.error || 'Erro ao criar critério');
      }
    } catch (error) {
      toast.error('Erro ao conectar ao servidor');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCriterion = async (criterion: Criterion) => {
    const action = criterion.active ? 'desativar' : 'ativar';
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} o critério "${criterion.name}"?`)) return;
    try {
      const response = await fetch(`/api/criterios/${criterion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !criterion.active }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao atualizar critério');
      toast.success(`Critério ${criterion.active ? 'desativado' : 'ativado'}`);
      fetchCriteria();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar critério');
    }
  };

  return (
    <div className="ui-page">
      <PageHeader eyebrow="Avaliações" title="Critérios de avaliação" description="Defina as perguntas e os comportamentos que serão avaliados." actions={
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setEditingCriterion(null); }}>
            <button onClick={() => { setEditingCriterion(null); setFormData({ name: '', description: '', modality: 'LEADERSHIP' }); setIsCreateOpen(true); }} className="ui-button ui-button-primary">
              <Plus className="w-4 h-4" />
              Novo Critério
            </button>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>{editingCriterion ? 'Editar Critério' : 'Criar Novo Critério'}</DialogTitle>
                <DialogDescription>
                  {editingCriterion ? 'Atualize o texto exibido no formulário de avaliação.' : 'Adicione uma nova pergunta que aparecerá no formulário de avaliação.'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="modality" className="text-sm font-medium">Modalidade</label>
                  <select id="modality" value={formData.modality} onChange={(e) => setFormData({ ...formData, modality: e.target.value as Criterion['modality'] })} className="ui-input">
                    <option value="LEADERSHIP">Avaliação da liderança</option>
                    <option value="PEER">Avaliação entre colegas</option>
                    <option value="BOTH">As duas modalidades</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">Nome (Curto)</label>
                  <input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Comunicação"
                    className="ui-input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">Descrição (O que será avaliado)</label>
                  <textarea
                    id="description"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Ex: Comunica-se de forma clara e respeitosa com a equipe."
                    className="ui-input resize-none"
                    rows={3}
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
                  {submitting ? 'Salvando...' : editingCriterion ? 'Salvar alterações' : 'Salvar Critério'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <div className="ui-table-shell">
        {loading ? (
          <LoadingState label="Carregando critérios" />
        ) : criteria.length === 0 ? (
          <EmptyState icon={ListTodo} title="Nenhum critério cadastrado" description="Crie as perguntas que irão compor a avaliação." />
        ) : (
          <div className="ui-table-mobile-cards overflow-x-auto">
            <table className="ui-table">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Critério</th>
                  <th className="px-6 py-4">Modalidade</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {criteria.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td data-label="Critério" className="px-6 py-4">
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-slate-500 mt-1">{c.description}</div>
                    </td>
                    <td data-label="Modalidade" className="px-6 py-4 text-slate-600">{{ LEADERSHIP: 'Liderança', PEER: 'Colegas', BOTH: 'Ambas' }[c.modality]}</td>
                    <td data-label="Status" className="px-6 py-4">
                      <StatusBadge tone={c.active ? 'success' : 'neutral'}>{c.active ? 'Ativo' : 'Inativo'}</StatusBadge>
                    </td>
                    <td data-label="Ações" className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEditingCriterion(c); setFormData({ name: c.name, description: c.description, modality: c.modality }); setIsCreateOpen(true); }} className="p-2 text-slate-600 hover:bg-slate-100 rounded-md" title="Editar" aria-label={`Editar ${c.name}`}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleCriterion(c)} className={`rounded-md p-2 ${c.active ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`} title={c.active ? 'Desativar' : 'Ativar'} aria-label={`${c.active ? 'Desativar' : 'Ativar'} ${c.name}`}>
                          {c.active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
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
