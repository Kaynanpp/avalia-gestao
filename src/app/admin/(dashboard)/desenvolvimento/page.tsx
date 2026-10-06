import { DevelopmentPlansPage } from '@/components/admin/development-plans-page';
import { getManagers } from '@/lib/services/managers.service';
import { getDepartments } from '@/lib/services/departments.service';

export const dynamic = 'force-dynamic';
export default async function DesenvolvimentoPage() {
  const [managers, departments] = await Promise.all([getManagers(), getDepartments()]);
  return <DevelopmentPlansPage
    leaderships={managers.map((item) => ({ id: item.id, name: item.name, departmentName: item.departmentName, active: item.status === 'ACTIVE' }))}
    departments={departments.map((item) => ({ id: item.id, name: item.name, active: item.active }))}
  />;
}
