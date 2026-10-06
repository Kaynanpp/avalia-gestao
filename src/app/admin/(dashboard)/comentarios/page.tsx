import { TeamCommentsPage } from '@/components/admin/team-comments-page';
import { getManagers } from '@/lib/services/managers.service';
import { getPeriods } from '@/lib/services/periods.service';

export const dynamic = 'force-dynamic';

export default async function CommentsPage() {
  const [periods, managers] = await Promise.all([getPeriods(), getManagers()]);
  const initialPeriodId = periods.find((period) => period.status === 'OPEN')?.id || periods[0]?.id || '';

  return (
    <TeamCommentsPage
      periods={periods.map(({ id, name }) => ({ id, name }))}
      managers={managers.map(({ id, name }) => ({ id, name }))}
      initialPeriodId={initialPeriodId}
    />
  );
}
