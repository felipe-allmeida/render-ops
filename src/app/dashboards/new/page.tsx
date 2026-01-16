import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NewDashboardContent } from './new-dashboard-content';

export default async function NewDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return <NewDashboardContent user={session.user} />;
}
