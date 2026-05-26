import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/** Join customer room and refresh dashboard/orders on order events. */
export function useCustomerRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const socket = io(`${SOCKET_URL}/realtime`);
    socket.emit('join_customer', userId);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['customer-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['order-history'] });
    };

    socket.on('customer_notification', invalidate);
    socket.on('order_update', invalidate);

    return () => {
      socket.disconnect();
    };
  }, [userId, queryClient]);
}
