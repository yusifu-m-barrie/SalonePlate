import { Sidebar } from '@/components/layout/sidebar';
import { DashboardAuthGuard } from '@/components/dashboard/dashboard-auth-guard';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <ResponsiveShell sidebar={<Sidebar />} title="Admin dashboard">
        {children}
      </ResponsiveShell>
    </DashboardAuthGuard>
  );
}
