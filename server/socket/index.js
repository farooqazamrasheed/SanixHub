const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

// Initialize Socket.IO server
const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        // Allow anonymous connections for public features
        socket.isAuthenticated = false;
        socket.isAdmin = false;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        console.log('⚠️ Token valid but user not found, allowing unauthenticated connection');
        socket.isAuthenticated = false;
        socket.isAdmin = false;
        return next();
      }

      socket.userId = user._id.toString();
      socket.user = user;
      socket.isAuthenticated = true;
      socket.isAdmin = user.role === 'superadmin' || user.role === 'admin';
      
      next();
    } catch (error) {
      // Log specific error for debugging
      if (error.name === 'TokenExpiredError') {
        console.error(`⚠️ Socket auth failed: JWT expired at ${error.expiredAt}`);
      } else if (error.name === 'JsonWebTokenError') {
        console.error(`⚠️ Socket auth failed: Invalid token - ${error.message}`);
      } else {
        console.error('⚠️ Socket authentication error:', error.message);
      }
      
      // Allow connection but mark as unauthenticated
      socket.isAuthenticated = false;
      socket.isAdmin = false;
      next();
    }
  });

  // Main connection handler
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} | User: ${socket.userId || 'Anonymous'} | Admin: ${socket.isAdmin}`);

    // Join user-specific room if authenticated
    if (socket.isAuthenticated) {
      socket.join(`user:${socket.userId}`);
      console.log(`👤 User ${socket.userId} joined personal room`);
    }

    // Join admin room if admin
    if (socket.isAdmin) {
      socket.join('admin:all');
      socket.emit('admin:connected', { message: 'Connected to admin channel' });
      console.log(`👨‍💼 Admin ${socket.userId} joined admin room`);
    }

    // Import and setup event handlers
    require('./handlers/inventoryHandler')(io, socket);
    require('./handlers/orderHandler')(io, socket);
    require('./handlers/cartHandler')(io, socket);
    require('./handlers/adminHandler')(io, socket);
    require('./handlers/userHandler')(io, socket);
    require('./handlers/wishlistHandler')(io, socket);
    require('./handlers/settingsHandler')(io, socket);
    require('./handlers/couponHandler')(io, socket);
    require('./handlers/notificationHandler')(io, socket);
    require('./handlers/pricingHandler')(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error for ${socket.id}:`, error);
    });

    // Heartbeat
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  console.log('🚀 Socket.IO server initialized');
  return io;
};

// Get Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

// Emit to all admins
const emitToAdmins = (event, data) => {
  if (io) {
    io.to('admin:all').emit(event, data);
  }
};

// Emit to specific room
const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

// Broadcast to all connected clients
const broadcast = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToUser,
  emitToAdmins,
  emitToRoom,
  broadcast
};
