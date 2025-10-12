'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = getSocket();
    
    if (socketInstance) {
      setSocket(socketInstance);
      setIsConnected(socketInstance.connected);

      const handleConnect = () => setIsConnected(true);
      const handleDisconnect = () => setIsConnected(false);

      socketInstance.on('connect', handleConnect);
      socketInstance.on('disconnect', handleDisconnect);

      return () => {
        socketInstance.off('connect', handleConnect);
        socketInstance.off('disconnect', handleDisconnect);
      };
    }
  }, []);

  return { socket, isConnected };
}
