import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { initializeSocket, getSocket, disconnectSocket, isSocketConnected } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    
    // Initialize socket
    const socketInstance = initializeSocket({
      token: token || undefined,
      autoConnect: true
    });

    setSocket(socketInstance);

    // Setup event listeners
    const handleConnect = () => {
      console.log('✅ Socket connected in hook');
      setConnected(true);
    };

    const handleDisconnect = () => {
      console.log('❌ Socket disconnected in hook');
      setConnected(false);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    // Set initial connection state
    setConnected(socketInstance.connected);

    // If token exists and socket is not connected, reconnect
    if (token && !socketInstance.connected) {
      socketInstance.connect();
    }

    // Cleanup
    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
    };
  }, [isAuthenticated]);

  // Emit user online event when authenticated
  useEffect(() => {
    if (socket && connected && isAuthenticated) {
      socket.emit('user:online');
    }
  }, [socket, connected, isAuthenticated]);

  return {
    socket,
    connected,
    isConnected: isSocketConnected
  };
};

export default useSocket;
