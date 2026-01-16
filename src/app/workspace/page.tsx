import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from './dashboard-content';

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return <DashboardContent user={session.user} />;
}
