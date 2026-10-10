import type { Metadata } from 'next';
import LoginForm from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Supervisor Login' };

export default function SupervisorLoginPage() {
  return <LoginForm portal="supervisor" />;
}
