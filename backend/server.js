const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Import database and models
const { testConnection, syncDatabase } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const consultationRoutes = require('./routes/consultations');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/consultations', consultationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Store active rooms and users
const rooms = new Map();
const users = new Map();

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'WebRTC Signaling Server is running',
    activeRooms: rooms.size,
    connectedUsers: users.size
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle joining a room
  socket.on('join-room', (data) => {
    const { roomId, role, userInfo } = data;
    
    console.log(`User ${socket.id} joining room ${roomId} as ${role}`);
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        createdAt: new Date().toISOString()
      });
    }

    const room = rooms.get(roomId);
    
    // Check room capacity and role conflicts
    const currentUsers = Array.from(room.users.values());
    const sameRoleUser = currentUsers.find(user => user.role === role);
    
    if (room.users.size >= 2) {
      console.log(`Room ${roomId} is full (${room.users.size} users)`);
      socket.emit('room-error', {
        error: 'Room is full',
        message: 'This room already has the maximum number of users (2)'
      });
      return;
    }
    
    if (sameRoleUser) {
      console.log(`Room ${roomId} already has a ${role}`);
      socket.emit('room-error', {
        error: 'Role conflict',
        message: `This room already has a ${role}. Please try a different room.`
      });
      return;
    }
    
    // Store user information
    users.set(socket.id, {
      roomId,
      role,
      userInfo,
      socketId: socket.id
    });

    // Join the socket room
    socket.join(roomId);

    room.users.set(socket.id, {
      role,
      userInfo,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    });

    // Notify other users in the room
    socket.to(roomId).emit('user-joined', {
      user: {
        userId: socket.id,
        role,
        userInfo
      },
      roomUsers: Array.from(room.users.values())
    });

    // Send current room state to the joining user
    socket.emit('room-joined', {
      roomId,
      users: Array.from(room.users.values()).filter(u => u.socketId !== socket.id)
    });

    console.log(`Room ${roomId} now has ${room.users.size} users`);
  });

  // Handle WebRTC offer
  socket.on('offer', (data) => {
    const { roomId, offer } = data;
    console.log(`Offer received for room ${roomId}`);
    
    // Forward offer to other users in the room
    socket.to(roomId).emit('offer', {
      offer,
      from: socket.id
    });
  });

  // Handle WebRTC answer
  socket.on('answer', (data) => {
    const { roomId, answer } = data;
    console.log(`Answer received for room ${roomId}`);
    
    // Forward answer to other users in the room
    socket.to(roomId).emit('answer', {
      answer,
      from: socket.id
    });
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const { roomId, candidate } = data;
    console.log(`ICE candidate received for room ${roomId}`);
    
    // Forward ICE candidate to other users in the room
    socket.to(roomId).emit('ice-candidate', {
      candidate,
      from: socket.id
    });
  });

  // Handle chat messages (optional feature)
  socket.on('chat-message', (data) => {
    const { roomId, message, timestamp } = data;
    const user = users.get(socket.id);
    
    if (user) {
      const chatData = {
        message,
        timestamp,
        from: user.userInfo,
        role: user.role
      };
      
      // Broadcast message to all users in the room
      io.to(roomId).emit('chat-message', chatData);
      console.log(`Chat message in room ${roomId}: ${message}`);
    }
  });

  // Handle screen sharing
  socket.on('screen-share-start', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('screen-share-start', {
      from: socket.id
    });
  });

  socket.on('screen-share-stop', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('screen-share-stop', {
      from: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const user = users.get(socket.id);
    if (user) {
      const { roomId } = user;
      
      // Remove user from room
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.users.delete(socket.id);
        
        // Notify other users in the room
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          remainingUsers: Array.from(room.users.values())
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        } else {
          console.log(`Room ${roomId} now has ${room.users.size} users`);
        }
      }
      
      // Remove user from users map
      users.delete(socket.id);
    }
  });

  // Handle explicit leave room
  socket.on('leave-room', (data) => {
    const { roomId } = data;
    const user = users.get(socket.id);
    
    if (user && user.roomId === roomId) {
      socket.leave(roomId);
      
      // Remove user from room
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.users.delete(socket.id);
        
        // Notify other users
        socket.to(roomId).emit('user-left', {
          userId: socket.id,
          remainingUsers: Array.from(room.users.values())
        });
        
        // Clean up empty rooms
        if (room.users.size === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
      
      users.delete(socket.id);
      console.log(`User ${socket.id} left room ${roomId}`);
    }
  });
});

// Error handling
io.on('error', (error) => {
  console.error('Socket.io error:', error);
});

// Initialize database and start server
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database models
    await syncDatabase();
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready for connections`);
      console.log(`🏥 Doctor-Patient Video Call System Active`);
      console.log(`💾 PostgreSQL Database connected and synchronized`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});