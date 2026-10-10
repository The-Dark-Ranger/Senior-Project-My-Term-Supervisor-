import type { Metadata } from 'next';
import LoginForm from '@/components/auth/login-form';

export const metadata: Metadata = { title: 'Student Login' };

export default function StudentLoginPage() {
  return <LoginForm portal="student" />;
}
