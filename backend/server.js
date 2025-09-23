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
const mediaRoutes = require('./routes/media');

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
app.use('/api/media', mediaRoutes);

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
  socket.on('join-room', async (data) => {
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
    
    // Check room capacity (allow up to 4 users for flexibility)
    const currentUsers = Array.from(room.users.values());
    
  
    
    // Check if user is already in the room (prevent duplicate connections)
    const existingUser = currentUsers.find(user => 
      user.userInfo && userInfo && 
      ((user.userInfo.email && user.userInfo.email === userInfo.email) ||
       (user.userInfo.phone && user.userInfo.phone === userInfo.phone))
    );
    
   
    
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
    const roomJoinedData = {
      roomId,
      users: Array.from(room.users.values()).filter(u => u.socketId !== socket.id)
    };

    // If doctor is joining, include room details with patient info
    if (role === 'doctor') {
      try {
        const { Room, Patient } = require('./models');
        const roomDetails = await Room.findOne({ 
          where: { roomId: roomId },
          include: [{ model: Patient, as: 'Patient' }]
        });
        
        if (roomDetails) {
          roomJoinedData.roomDetails = roomDetails;
        }
      } catch (error) {
        console.error('Error fetching room details for doctor:', error);
      }
    }

    socket.emit('room-joined', roomJoinedData);

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

  // Handle recording events
  socket.on('recording-started', (data) => {
    const { roomId, userId, userName, timestamp } = data;
    console.log(`Recording started by ${userName} (${userId}) in room ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit('recording-started', {
      userId,
      userName,
      timestamp,
      message: `${userName} started recording the session`
    });
  });

  socket.on('recording-stopped', (data) => {
    const { roomId, userId, userName, timestamp } = data;
    console.log(`Recording stopped by ${userName} (${userId}) in room ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit('recording-stopped', {
      userId,
      userName,
      timestamp,
      message: `${userName} stopped recording the session`
    });
  });

  // Handle recording start via socket
  socket.on('start-recording', async (data) => {
    const { roomId, recordingId, doctorId, patientId, timestamp } = data;
    
    try {
      // Import models
      const { ScreenRecording, Room } = require('./models');
      
      // Find the actual room by roomId to get the UUID
      const room = await Room.findOne({ where: { roomId: roomId } });
      if (!room) {
        socket.emit('recording-start-error', {
          error: 'Room not found',
          details: `Room with ID ${roomId} does not exist`
        });
        return;
      }
      
      // Get patientId from room if not provided
      const finalPatientId = patientId || room.patientId;
      
      if (!finalPatientId) {
        socket.emit('recording-start-error', {
          error: 'Patient not found',
          details: 'No patient has joined this room yet'
        });
        return;
      }
      
      // Create recording entry in database using the room's UUID
      const recording = await ScreenRecording.create({
        roomId: room.id, // Use the actual UUID from the room
        doctorId,
        patientId: finalPatientId,
        recordingData: null, // Will be updated when recording is saved
        fileName: `${recordingId}.webm`,
        startedAt: new Date(timestamp),
        status: 'recording'
      });
      
      console.log(`Recording started: ${recordingId} in room ${roomId} (UUID: ${room.id})`);
      
      // Notify all users in room about recording start
      socket.to(roomId).emit('recording-started', {
        recordingId,
        userId: socket.id,
        timestamp
      });
      
      // Send success response back to initiator
      socket.emit('recording-start-success', {
        recordingId: recording.id,
        fileName: recording.fileName,
        startedAt: recording.startedAt
      });
      
    } catch (error) {
      console.error('Error starting recording via socket:', error);
      socket.emit('recording-start-error', {
        error: 'Failed to start recording',
        details: error.message
      });
    }
  });

  // Handle live recording chunks
  socket.on('recording-chunk', (data) => {
    const { roomId, userId, chunkData, timestamp, chunkIndex } = data;
    
    // Log chunk received (for monitoring)
    console.log(`Received recording chunk ${chunkIndex} from user ${userId} in room ${roomId}`);
    
    // Optionally forward to other users for live monitoring
    // socket.to(roomId).emit('recording-chunk-received', {
    //   userId,
    //   chunkIndex,
    //   timestamp
    // });
    
    // Here you could implement real-time processing:
    // - Save chunks to temporary storage
    // - Process chunks for live streaming
    // - Implement backup mechanisms
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
    server.listen(PORT, async() => {
      console.log(`🚀 WebRTC Signaling Server running on port ${PORT}`);
      console.log(`📡 Socket.io server ready for connections`);
      console.log(`🏥 Doctor-Patient Video Call System Active`);
      // console.log(`💾 PostgreSQL Database connected and synchronized`);
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