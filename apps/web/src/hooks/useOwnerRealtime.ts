'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useOwnerRealtime(restaurantId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !restaurantId) return;

    const socket = io(`${SOCKET_URL}/realtime`);
    socket.emit('join_restaurant', restaurantId);

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['owner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['owner-orders'] });
      queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
      queryClient.invalidateQueries({ queryKey: ['owner-order'] });
    };

    socket.on('new_order', invalidate);
    socket.on('owner_notification', invalidate);
    socket.on('order_update', invalidate);

    return () => {
      socket.disconnect();
    };
  }, [restaurantId, enabled, queryClient]);
}
