import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

interface SocketConfig {
  token?: string;
  autoConnect?: boolean;
}

// Initialize socket connection
export const initializeSocket = (config: SocketConfig = {}): Socket => {
  if (socket && socket.connected) {
    return socket;
  }

  // Remove /api from the URL for socket.io connection
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const serverUrl = apiUrl.replace('/api', '');
  
  console.log('🔌 Initializing Socket.IO connection to:', serverUrl);
  
  socket = io(serverUrl, {
    path: '/socket.io/',
    auth: {
      token: config.token
    },
    autoConnect: config.autoConnect !== false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  // Connection event handlers
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    
    // Check if it's an auth error
    if (error.message.includes('jwt') || error.message.includes('token')) {
      console.warn('⚠️ Authentication token may be expired. Please log out and log back in.');
    }
  });

  socket.on('error', (error) => {
    console.error('⚠️ Socket error:', error);
  });

  return socket;
};

// Get existing socket instance
export const getSocket = (): Socket | null => {
  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
};

// Reconnect socket
export const reconnectSocket = (): void => {
  if (socket && !socket.connected) {
    socket.connect();
    console.log('🔄 Socket reconnecting...');
  }
};

// Update auth token
export const updateSocketAuth = (token: string): void => {
  if (socket) {
    socket.auth = { token };
    if (socket.connected) {
      socket.disconnect();
      socket.connect();
    }
  }
};

// Check connection status
export const isSocketConnected = (): boolean => {
  return socket ? socket.connected : false;
};

export default socket;
