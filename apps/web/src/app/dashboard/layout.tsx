import { Sidebar } from '@/components/layout/sidebar';
import { DashboardAuthGuard } from '@/components/dashboard/dashboard-auth-guard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardAuthGuard>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </DashboardAuthGuard>
  );
}
