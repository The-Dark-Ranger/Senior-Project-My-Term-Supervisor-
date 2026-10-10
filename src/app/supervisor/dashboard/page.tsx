import type { Metadata } from 'next';
import { isAiConfigured } from '@/ai/config';
import SupervisorDashboard from './supervisor-dashboard';

// Rendered per request so a runtime GEMINI_API_KEY is detected.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Supervisor Dashboard' };

export default function SupervisorDashboardPage() {
  return <SupervisorDashboard aiEnabled={isAiConfigured()} />;
}
