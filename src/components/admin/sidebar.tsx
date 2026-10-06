'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  ListTodo,
  BarChart3,
  Settings,
  Menu,
  X,
  FileText,
  ClipboardCheck,
  MessageSquareText,
  ShieldCheck,
  History,
  ClipboardList,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { BrandLogo } from '@/components/brand-logo';

interface SidebarProps {
  userRole: 'ADMIN' | 'RH';
  appName: string;
  companyName: string;
}

const navigationGroups = [
  { label: 'Visão geral', items: [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, exact: true },
  ] },
  { label: 'Avaliações', items: [
    { name: 'Resultados', href: '/admin/avaliacoes', icon: FileText, exact: false },
    { name: 'Relatórios', href: '/admin/relatorios', icon: BarChart3, exact: false },
    { name: 'Comentários', href: '/admin/comentarios', icon: MessageSquareText, exact: false },
  ] },
  { label: 'Pessoas', items: [
    { name: 'Lideranças', href: '/admin/liderancas', icon: Users, exact: false },
    { name: 'Colaboradores', href: '/admin/colegas', icon: ClipboardCheck, exact: false },
    { name: 'Setores', href: '/admin/setores', icon: Building2, exact: false },
  ] },
  { label: 'Gestão', items: [
    { name: 'Ciclos e períodos', href: '/admin/periodos', icon: CalendarDays, exact: false },
    { name: 'Critérios', href: '/admin/criterios', icon: ListTodo, exact: false },
    { name: 'Planos de desenvolvimento', href: '/admin/desenvolvimento', icon: ClipboardList, exact: false },
  ] },
  { label: 'Administração', items: [
    { name: 'Usuários', href: '/admin/usuarios', icon: ShieldCheck, exact: false, adminOnly: true },
    { name: 'Auditoria', href: '/admin/auditoria', icon: History, exact: false, adminOnly: true },
    { name: 'Configurações', href: '/admin/configuracoes', icon: Settings, exact: false, adminOnly: true },
  ] },
];

export function Sidebar({ userRole, appName, companyName }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile menu button */}
      <div className="no-print fixed left-3 top-2.5 z-50 md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={isOpen}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="no-print md:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "no-print fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col border-r border-slate-800 bg-slate-950 text-slate-300 transition-transform duration-200 ease-out md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex min-h-20 items-center gap-3 border-b border-slate-800 px-4 py-3">
          <BrandLogo href="/admin" className="w-28" priority />
          <span className="min-w-0 border-l border-slate-800 pl-3">
            <span className="block truncate text-sm font-semibold text-white">{appName}</span>
            <span className="mt-0.5 block truncate text-[11px] text-slate-500">{companyName}</span>
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navegação do painel">
          {navigationGroups.map((group) => {
            const items = group.items.filter(item => !('adminOnly' in item) || !item.adminOnly || userRole === 'ADMIN');
            if (!items.length) return null;
            return <div key={group.label} className="mb-5 last:mb-0">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
              <div className="space-y-1">{items.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href) || (item.href === '/admin/liderancas' && pathname.startsWith('/admin/gerentes'));
            
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "group flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "mr-3 h-[18px] w-[18px] flex-shrink-0",
                    isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}</div>
            </div>;
          })}
        </nav>
        
        <div className="border-t border-slate-800 p-4 text-xs leading-5 text-slate-500">
          <span className="block font-medium text-slate-400">Ambiente interno</span>
          Resultados protegidos por anonimato
        </div>
      </div>
    </>
  );
}
