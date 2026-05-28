import { RestaurantSidebar } from '@/components/layout/restaurant-sidebar';
import { RestaurantAuthGuard } from '@/components/restaurant/restaurant-auth-guard';
import { ResponsiveShell } from '@/components/layout/ResponsiveShell';

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantAuthGuard>
      <ResponsiveShell sidebar={<RestaurantSidebar />} title="Restaurant owner">
        {children}
      </ResponsiveShell>
    </RestaurantAuthGuard>
  );
}
