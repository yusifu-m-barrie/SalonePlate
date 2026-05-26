import { RestaurantSidebar } from '@/components/layout/restaurant-sidebar';
import { RestaurantAuthGuard } from '@/components/restaurant/restaurant-auth-guard';

export default function RestaurantLayout({ children }: { children: React.ReactNode }) {
  return (
    <RestaurantAuthGuard>
      <div className="flex min-h-screen">
        <RestaurantSidebar />
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </RestaurantAuthGuard>
  );
}
