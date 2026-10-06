import Link from 'next/link';
import { Archive } from 'lucide-react';

export default function RetiredSelfEvaluationsPage() {
  return (
    <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
      <Archive className="h-9 w-9 text-slate-500" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Autoavaliação encerrada</h1>
      <p className="mt-3 text-slate-600">Os registros históricos de autoavaliação foram preservados. Novos links e respostas dessa modalidade estão desativados.</p>
      <p className="mt-3 text-slate-600">Cadastre os colaboradores e suas matrículas na área Colaboradores. Cada pessoa acessa o formulário geral e vê somente colegas do próprio setor. Os resultados continuam separados dos resultados de lideranças.</p>
      <Link href="/admin/colegas" className="mt-6 inline-flex rounded-lg bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700">Abrir avaliação de colegas</Link>
    </section>
  );
}

