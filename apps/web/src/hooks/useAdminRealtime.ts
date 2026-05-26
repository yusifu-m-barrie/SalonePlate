'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useAdminRealtime(enabled: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const socket = io(`${SOCKET_URL}/realtime`);
    socket.emit('join_admin');

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-communications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-restaurants'] });
    };

    socket.on('admin_notification', invalidate);
    socket.on('order_update', invalidate);

    return () => {
      socket.disconnect();
    };
  }, [enabled, queryClient]);
}
