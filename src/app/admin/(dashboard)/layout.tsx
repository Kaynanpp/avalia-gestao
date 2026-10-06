import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth.service';
import { Sidebar } from '@/components/admin/sidebar';
import { Topbar } from '@/components/admin/topbar';
import { getSettings } from '@/lib/services/settings.service';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // If not authenticated, redirect to login
  if (!user) {
    redirect('/admin/login');
  }

  if (user.mustChangePassword) {
    redirect('/admin/conta?obrigatorio=1');
  }

  const settings = await getSettings();

  return (
    <div className="admin-shell flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <Sidebar userRole={user.role} appName={settings.appName} companyName={settings.companyName} />
      
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar userName={user.name} userRole={user.role} />
        
        <main className="admin-main flex-1 overflow-y-auto focus:outline-none">
          <div className="admin-content mx-auto max-w-[90rem] px-4 py-6 pb-16 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
