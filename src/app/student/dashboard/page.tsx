import type { Metadata } from 'next';
import { isAiConfigured } from '@/ai/config';
import StudentDashboard from './student-dashboard';

// Rendered per request so a runtime GEMINI_API_KEY is detected.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Student Dashboard' };

export default function StudentDashboardPage() {
  return <StudentDashboard aiEnabled={isAiConfigured()} />;
}
