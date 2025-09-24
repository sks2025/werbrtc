const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const path = require('path');


// Import database and models
const { testConnection, syncDatabase } = require('./models');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const consultationRoutes = require('./routes/consultations');
const mediaRoutes = require('./routes/media');
const emailRoutes = require('./routes/email');
const locationRoutes = require('./routes/location');
const { router: adminRoutes } = require('./routes/admin');

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
// Serve static files for uploads (images, videos, recordings)
app.use('/uploads', express.static(path.join(__dirname, 'routes/uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to show uploaded files URLs
app.get('/api/test-uploads', (req, res) => {
  const fs = require('fs');
  const uploadsPath = path.join(__dirname, 'routes/uploads');
  
  try {
    const files = fs.readdirSync(uploadsPath);
    const fileUrls = files.map(file => ({
      fileName: file,
      url: `${req.protocol}://${req.get('host')}/uploads/${file}`,
      type: path.extname(file).toLowerCase()
    }));
    
    res.json({
      success: true,
      message: 'Upload URLs generated successfully',
      baseUrl: `${req.protocol}://${req.get('host')}/uploads/`,
      files: fileUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading uploads directory',
      error: error.message
    });
  }
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
          include: [{ model: Patient, as: 'patient' }]
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

  // ===== UNIFIED MEDIA SOCKET HANDLERS =====

  // Start recording using unified media table
  socket.on('start-recording', async (data) => {
    const { roomId, recordingId, doctorId, patientId, timestamp } = data;
    
    try {
      // Import models
      const { RoomMedia, Room } = require('./models');
      
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
      
      // Create recording entry in unified media table
      const recording = await RoomMedia.create({
        roomId: room.id, // Use the actual UUID from the room
        mediaType: 'screen_recording',
        doctorId,
        patientId: finalPatientId,
        mediaData: '', // Will be updated with actual recording data
        fileName: `${recordingId}.webm`,
        startedAt: new Date(timestamp),
        status: 'recording',
        isLiveStreaming: true,
        metadata: {
          originalRoomId: roomId,
          socketId: socket.id,
          startedViaSocket: true
        }
      });
      
      console.log(`Recording started: ${recordingId} in room ${roomId} (UUID: ${room.id})`);
      
      // Notify all users in room about recording start
      socket.to(roomId).emit('recording-started', {
        recordingId: recording.id,
        userId: socket.id,
        timestamp,
        mediaId: recording.id
      });
      
      // Send success response back to initiator
      socket.emit('recording-start-success', {
        recordingId: recording.id,
        mediaId: recording.id,
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

  // Save media via socket (unified handler for all media types)
  socket.on('save-media', async (data) => {
    const { 
      roomId, 
      mediaType, 
      doctorId, 
      patientId, 
      mediaData, 
      fileName, 
      metadata = {},
      // Screen recording specific
      duration,
      fileSize,
      startedAt,
      endedAt,
      // Signature specific
      signedBy,
      purpose,
      // Image specific
      description,
      // Common
      status = 'completed'
    } = data;

    try {
      // Import models
      const { RoomMedia, Room } = require('./models');
      
      // Validate required fields
      if (!roomId || !mediaType || !mediaData) {
        socket.emit('media-save-error', {
          error: 'Missing required fields: roomId, mediaType, mediaData'
        });
        return;
      }

      // Find room
      const room = await Room.findOne({ where: { roomId: roomId } });
      if (!room) {
        socket.emit('media-save-error', {
          error: 'Room not found',
          details: `Room with ID ${roomId} does not exist`
        });
        return;
      }

      // Create media entry
      const mediaEntry = await RoomMedia.create({
        roomId: room.id,
        mediaType,
        doctorId,
        patientId,
        mediaData,
        fileName,
        metadata: {
          ...metadata,
          originalRoomId: roomId,
          socketId: socket.id,
          savedViaSocket: true
        },
        // Type-specific fields
        duration,
        fileSize,
        startedAt: startedAt ? new Date(startedAt) : null,
        endedAt: endedAt ? new Date(endedAt) : null,
        signedBy,
        purpose,
        description,
        status,
        capturedAt: new Date()
      });

      console.log(`Media saved via socket: ${mediaType} in room ${roomId}`);

      // Notify all users in room
      socket.to(roomId).emit('media-saved', {
        mediaId: mediaEntry.id,
        mediaType: mediaEntry.mediaType,
        fileName: mediaEntry.fileName,
        capturedAt: mediaEntry.capturedAt,
        userId: socket.id
      });

      // Send success response back to initiator
      socket.emit('media-save-success', {
        mediaId: mediaEntry.id,
        mediaType: mediaEntry.mediaType,
        fileName: mediaEntry.fileName,
        capturedAt: mediaEntry.capturedAt
      });

    } catch (error) {
      console.error('Error saving media via socket:', error);
      socket.emit('media-save-error', {
        error: 'Failed to save media',
        details: error.message
      });
    }
  });

  // Handle live recording chunks with unified media table
  socket.on('recording-chunk', async (data) => {
    const { roomId, mediaId, userId, chunkData, timestamp, chunkIndex, chunkSize, mimeType } = data;
    
    try {
      // Log chunk received (for monitoring)
      console.log(`Received recording chunk ${chunkIndex} from user ${userId} in room ${roomId} (${chunkSize} bytes)`);
      
      if (mediaId) {
        // Import models
        const { RoomMedia } = require('./models');
        
        // Update media with live chunk information
        const media = await RoomMedia.findByPk(mediaId);
        if (media) {
          const currentChunks = media.liveChunks || [];
          currentChunks.push({
            index: chunkIndex,
            timestamp,
            size: chunkSize || (chunkData ? chunkData.length : 0),
            mimeType: mimeType || 'video/webm',
            received_at: new Date(),
            hasBase64Data: !!chunkData
          });

          // Store base64 data if provided
          let updatedData = {
            liveChunks: currentChunks,
            isLiveStreaming: true
          };
          
          // If this is the first chunk with actual data, store it
          if (chunkData && chunkIndex === 0) {
            updatedData.mediaData = chunkData;
          } else if (chunkData && media.mediaData) {
            // Append to existing data (not recommended for large files, but for live streaming)
            // In production, you might want to store chunks separately
            console.log('Appending chunk data to existing media data');
          }

          await media.update(updatedData);
        }
      }
      
      // Forward chunk info to other users for live monitoring
      socket.to(roomId).emit('recording-chunk-received', {
        userId,
        chunkIndex,
        timestamp,
        mediaId,
        chunkSize,
        mimeType
      });
      
    } catch (error) {
      console.error('Error handling recording chunk:', error);
    }
  });

  // Handle live base64 chunk streaming (new dedicated handler)
  socket.on('live-base64-chunk', async (data) => {
    const { 
      roomId, 
      mediaId, 
      userId, 
      userName, 
      base64Data, 
      chunkIndex, 
      timestamp, 
      chunkSize, 
      mimeType, 
      totalChunks 
    } = data;
    
    try {
      console.log(`Live base64 chunk ${chunkIndex} received from ${userName} in room ${roomId}`);
      console.log(`Chunk size: ${chunkSize} bytes, Total chunks so far: ${totalChunks}`);
      
      // Store in memory for live access (you might want to use Redis for production)
      if (!global.liveBase64Streams) {
        global.liveBase64Streams = new Map();
      }
      
      const streamKey = `${roomId}_${mediaId}`;
      if (!global.liveBase64Streams.has(streamKey)) {
        global.liveBase64Streams.set(streamKey, {
          chunks: [],
          metadata: {
            roomId,
            mediaId,
            userId,
            userName,
            startedAt: timestamp,
            mimeType
          }
        });
      }
      
      const stream = global.liveBase64Streams.get(streamKey);
      stream.chunks.push({
        index: chunkIndex,
        data: base64Data,
        timestamp,
        size: chunkSize
      });
      
      // Forward live base64 chunk to other users in room
      socket.to(roomId).emit('live-base64-chunk-received', {
        userId,
        userName,
        chunkIndex,
        timestamp,
        chunkSize,
        mimeType,
        totalChunks,
        base64Data // Send actual base64 data to other users for live processing
      });
      
      // Copy to clipboard on server side (for debugging)
      console.log('Base64 chunk data available on server');
      
    } catch (error) {
      console.error('Error handling live base64 chunk:', error);
    }
  });

  // Get live base64 stream data
  socket.on('get-live-base64-stream', (data) => {
    const { roomId, mediaId } = data;
    const streamKey = `${roomId}_${mediaId}`;
    
    try {
      if (global.liveBase64Streams && global.liveBase64Streams.has(streamKey)) {
        const stream = global.liveBase64Streams.get(streamKey);
        
        // Combine all chunks into complete base64 data
        const sortedChunks = stream.chunks.sort((a, b) => a.index - b.index);
        const completeBase64Data = sortedChunks.map(chunk => chunk.data).join('');
        
        // Send complete stream data back to requester
        socket.emit('live-base64-stream-data', {
          roomId,
          mediaId,
          metadata: stream.metadata,
          totalChunks: sortedChunks.length,
          completeBase64Data,
          chunks: sortedChunks.map(chunk => ({
            index: chunk.index,
            timestamp: chunk.timestamp,
            size: chunk.size
          }))
        });
        
        console.log(`Sent complete live base64 stream for ${streamKey} (${sortedChunks.length} chunks)`);
      } else {
        socket.emit('live-base64-stream-error', {
          error: 'Stream not found',
          roomId,
          mediaId
        });
      }
    } catch (error) {
      console.error('Error getting live base64 stream:', error);
      socket.emit('live-base64-stream-error', {
        error: 'Failed to get stream data',
        details: error.message
      });
    }
  });

  // Complete live base64 stream (when recording stops)
  socket.on('complete-live-base64-stream', (data) => {
    const { roomId, mediaId } = data;
    const streamKey = `${roomId}_${mediaId}`;
    
    try {
      if (global.liveBase64Streams && global.liveBase64Streams.has(streamKey)) {
        const stream = global.liveBase64Streams.get(streamKey);
        const sortedChunks = stream.chunks.sort((a, b) => a.index - b.index);
        const completeBase64Data = sortedChunks.map(chunk => chunk.data).join('');
        
        // Notify all users in room that stream is complete
        socket.to(roomId).emit('live-base64-stream-complete', {
          roomId,
          mediaId,
          completeBase64Data,
          totalChunks: sortedChunks.length,
          metadata: stream.metadata
        });
        
        // Clean up memory
        global.liveBase64Streams.delete(streamKey);
        console.log(`Completed and cleaned up live base64 stream for ${streamKey}`);
      }
    } catch (error) {
      console.error('Error completing live base64 stream:', error);
    }
  });

  // Handle recording base64 data request
  socket.on('get-live-base64-stream-recording', async (data) => {
    const { roomId, recording } = data;
    
    try {
      console.log(`Received base64 recording data for room ${roomId}`);
      console.log(`Recording data size: ${recording ? recording.length : 0} characters`);
      
      // Store the recording data temporarily or process it
      if (recording && recording.startsWith('data:')) {
        // Process base64 data
        const base64Data = recording.split(',')[1]; // Remove data:video/webm;base64, prefix
        const buffer = Buffer.from(base64Data, 'base64');
        
        console.log(`Processed recording buffer size: ${buffer.length} bytes`);
        
        // Save to database via RoomMedia
        const { RoomMedia, Room } = require('./models');
        
        const room = await Room.findOne({ where: { roomId: roomId } });
        if (room) {
          const media = await RoomMedia.create({
            roomId: room.id,
            mediaType: 'screen_recording',
            mediaData: recording, // Store complete base64 data
            fileName: `recording_${Date.now()}.webm`,
            status: 'completed',
            fileSize: buffer.length,
            metadata: {
              originalRoomId: roomId,
              socketId: socket.id,
              savedViaSocket: true,
              receivedAt: new Date().toISOString()
            }
          });
          
          // Send success response with media info
          socket.emit('live-base64-stream-saved', {
            success: true,
            mediaId: media.id,
            fileName: media.fileName,
            fileSize: media.fileSize,
            roomId: roomId
          });
          
          console.log(`Recording saved successfully: ${media.fileName}`);
        } else {
          socket.emit('live-base64-stream-error', {
            error: 'Room not found',
            roomId: roomId
          });
        }
      } else {
        socket.emit('live-base64-stream-error', {
          error: 'Invalid base64 recording data',
          roomId: roomId
        });
      }
      
    } catch (error) {
      console.error('Error processing recording base64 data:', error);
      socket.emit('live-base64-stream-error', {
        error: 'Failed to process recording data',
        details: error.message,
        roomId: roomId
      });
    }
  });

  // Update media status via socket
  socket.on('update-media-status', async (data) => {
    const { mediaId, status, endedAt, duration, fileSize, mediaData } = data;
    
    try {
      const { RoomMedia } = require('./models');
      
      const media = await RoomMedia.findByPk(mediaId);
      if (!media) {
        socket.emit('media-update-error', {
          error: 'Media not found',
          mediaId
        });
        return;
      }

      const updateData = { status };
      if (endedAt) updateData.endedAt = new Date(endedAt);
      if (duration) updateData.duration = duration;
      if (fileSize) updateData.fileSize = fileSize;
      if (mediaData) updateData.mediaData = mediaData;
      
      // End live streaming if recording is completed
      if (status === 'completed') {
        updateData.isLiveStreaming = false;
      }

      await media.update(updateData);

      console.log(`Media status updated via socket: ${mediaId} -> ${status}`);

      // Notify all users in room
      socket.to(media.metadata?.originalRoomId || 'unknown').emit('media-status-updated', {
        mediaId: media.id,
        status: media.status,
        endedAt: media.endedAt,
        userId: socket.id
      });

      // Send success response
      socket.emit('media-update-success', {
        mediaId: media.id,
        status: media.status,
        endedAt: media.endedAt
      });

    } catch (error) {
      console.error('Error updating media status via socket:', error);
      socket.emit('media-update-error', {
        error: 'Failed to update media status',
        details: error.message,
        mediaId
      });
    }
  });

  // Live signature saving
  socket.on('save-signature-live', async (data) => {
    const { roomId, signedBy, doctorId, patientId, signatureData, purpose = 'consultation_agreement' } = data;
    
    try {
      const { RoomMedia, Room } = require('./models');
      
      const room = await Room.findOne({ where: { roomId: roomId } });
      if (!room) {
        socket.emit('signature-save-error', {
          error: 'Room not found'
        });
        return;
      }

      const signature = await RoomMedia.create({
        roomId: room.id,
        mediaType: 'digital_signature',
        doctorId: signedBy === 'doctor' ? doctorId : null,
        patientId: signedBy === 'patient' ? patientId : null,
        mediaData: signatureData,
        signedBy,
        purpose,
        status: 'completed',
        metadata: {
          originalRoomId: roomId,
          socketId: socket.id,
          savedViaSocket: true
        }
      });

      console.log(`Signature saved live via socket in room ${roomId}`);

      // Notify all users
      socket.to(roomId).emit('signature-saved-live', {
        mediaId: signature.id,
        signedBy: signature.signedBy,
        capturedAt: signature.capturedAt,
        userId: socket.id
      });

      socket.emit('signature-save-success', {
        mediaId: signature.id,
        signedBy: signature.signedBy,
        capturedAt: signature.capturedAt
      });

    } catch (error) {
      console.error('Error saving signature live:', error);
      socket.emit('signature-save-error', {
        error: 'Failed to save signature',
        details: error.message
      });
    }
  });

  // Live image capture saving
  socket.on('save-image-live', async (data) => {
    const { roomId, doctorId, patientId, imageData, fileName, description } = data;
    
    try {
      const { RoomMedia, Room } = require('./models');
      
      const room = await Room.findOne({ where: { roomId: roomId } });
      if (!room) {
        socket.emit('image-save-error', {
          error: 'Room not found'
        });
        return;
      }

      const image = await RoomMedia.create({
        roomId: room.id,
        mediaType: 'captured_image',
        doctorId,
        patientId,
        mediaData: imageData,
        fileName,
        description,
        status: 'completed',
        metadata: {
          originalRoomId: roomId,
          socketId: socket.id,
          savedViaSocket: true
        }
      });

      console.log(`Image captured live via socket in room ${roomId}`);

      // Notify all users
      socket.to(roomId).emit('image-captured-live', {
        mediaId: image.id,
        fileName: image.fileName,
        capturedAt: image.capturedAt,
        userId: socket.id
      });

      socket.emit('image-save-success', {
        mediaId: image.id,
        fileName: image.fileName,
        capturedAt: image.capturedAt
      });

    } catch (error) {
      console.error('Error saving image live:', error);
      socket.emit('image-save-error', {
        error: 'Failed to save image',
        details: error.message
      });
    }
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