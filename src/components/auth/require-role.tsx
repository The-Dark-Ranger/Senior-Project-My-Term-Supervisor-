'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/components/providers/auth-provider';
import type { AppUser, Role } from '@/types';

/** Client-side route guard: renders `children` only for a signed-in user with the given role. */
export default function RequireRole({ role, children }: { role: Role; children: (user: AppUser) => React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/${role}/login`);
    else if (user.role !== role) router.replace(`/${user.role}/dashboard`);
  }, [loading, user, role, router]);

  if (loading || !user || user.role !== role) return <DashboardSkeleton />;
  return <>{children(user)}</>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
