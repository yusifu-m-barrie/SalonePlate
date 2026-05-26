import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:4000';

/** Join restaurant room and refresh owner queries on order events. */
export function useOwnerRealtime(restaurantId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!restaurantId) return;

    const socket = io(`${SOCKET_URL}/realtime`);
    socket.emit('join_restaurant', restaurantId);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
    };

    socket.on('new_order', invalidate);
    socket.on('owner_notification', invalidate);
    socket.on('order_update', invalidate);

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, queryClient]);
}
