'use client';

import { PRODUCT } from '@/lib/product';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Login realizado com sucesso');
        router.push(data.mustChangePassword ? '/admin/conta?obrigatorio=1' : '/admin');
        router.refresh();
      } else {
        toast.error(data.error || 'Erro ao realizar login');
        setLoading(false);
      }
    } catch {
      toast.error('Não foi possível entrar. Verifique a conexão e tente novamente.');
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-slate-950 sm:px-6">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="flex flex-col justify-between bg-slate-950 p-7 text-white sm:p-9">
          <div>
            <BrandLogo className="w-48" priority />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">{PRODUCT.name}</p>
            <h1 className="mt-3 text-2xl font-bold leading-tight">Informações para decisões de pessoas mais seguras</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">Acompanhe ciclos, participação, resultados anônimos e planos de desenvolvimento em um só lugar.</p>
          </div>
          <div className="mt-8 flex items-start gap-3 border-t border-slate-800 pt-5 text-xs leading-5 text-slate-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            Acesso exclusivo para pessoas autorizadas do RH/DP e administração.
          </div>
        </aside>

        <section className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-7">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"><Lock className="h-5 w-5" /></span>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Acesso ao painel</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Entre com sua conta corporativa para continuar.</p>
          </div>
          <form className="space-y-6" onSubmit={handleLogin} noValidate>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ui-input pl-10"
                  placeholder="nome@empresa.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ui-input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  "ui-button-primary w-full",
                  loading 
                    ? "cursor-wait" 
                    : ""
                )}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </div>
          </form>
          <div className="mt-7 border-t border-slate-100 pt-5 text-center dark:border-slate-800">
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            &larr; Voltar para a página inicial
          </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
