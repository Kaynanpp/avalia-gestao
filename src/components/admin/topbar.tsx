'use client';

import { PRODUCT } from '@/lib/product';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { LogOut, User } from 'lucide-react';
import { USER_ROLE_LABELS } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';

interface TopbarProps {
  userName: string;
  userRole: string;
}

export function Topbar({ userName, userRole }: TopbarProps) {
  const router = useRouter();

  const signOutClient = async () => {
    const [{ signOut }, { auth }] = await Promise.all([
      import('firebase/auth'),
      import('@/lib/firebase/client'),
    ]);
    await signOut(auth);
  };

  const handleLogout = async () => {
    try {
      const [res] = await Promise.all([
        fetch('/api/admin/logout', { method: 'POST' }),
        signOutClient(),
      ]);
      if (res.ok) {
        router.push('/admin/login');
        router.refresh();
      } else {
        toast.error('Erro ao fazer logout');
      }
    } catch {
      await signOutClient().catch(() => undefined);
      toast.error('Erro ao conectar ao servidor');
      router.replace('/admin/login');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 pl-16 pr-4 dark:border-slate-800 dark:bg-slate-950/95 sm:px-6 md:pl-6">
      <div className="min-w-0 md:hidden">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">Painel RH/DP</p>
        <p className="text-xs text-slate-500">{PRODUCT.name}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden sm:block text-right">
          <p className="text-sm font-medium text-slate-900 leading-none mb-1">{userName}</p>
          <p className="text-xs text-slate-500 leading-none">{USER_ROLE_LABELS[userRole]}</p>
        </div>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger aria-label="Abrir opções da minha conta" className="focus:outline-none ring-offset-2 focus:ring-2 ring-orange-500 rounded-full">
            <Avatar className="h-9 w-9 border border-slate-200 hover:border-orange-300 transition-colors">
              <AvatarFallback className="bg-orange-50 text-orange-700 font-medium">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 sm:hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
              <p className="text-xs text-slate-500">{USER_ROLE_LABELS[userRole]}</p>
            </div>
            <DropdownMenuSeparator className="sm:hidden" />
            <DropdownMenuItem onSelect={() => router.push('/admin/conta')} className="text-slate-600 cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Trocar senha</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair do sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
