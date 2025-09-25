/**
 * LIVE MEDIA SAVING EXAMPLE - WebRTC Video Consultation System
 * 
 * This example demonstrates how to use the unified media saving system
 * with real-time Socket.io communication.
 * 
 * Use this as a reference for implementing frontend functionality.
 */

// Example Socket.io client setup (for frontend)
const exampleSocketUsage = {
  
  // Initialize socket connection
  initSocket: function(roomId, userInfo) {
    const socket = io('https://api.stechooze.com'); // Your backend URL
    
    // Join room
    socket.emit('join-room', {
      roomId: roomId,
      role: userInfo.role, // 'doctor' or 'patient'
      userInfo: userInfo
    });
    
    return socket;
  },
  
  // Start screen recording with live saving
  startScreenRecording: function(socket, roomId, doctorId, patientId) {
    const recordingId = `recording_${Date.now()}`;
    
    // Start recording in database
    socket.emit('start-recording', {
      roomId: roomId,
      recordingId: recordingId,
      doctorId: doctorId,
      patientId: patientId,
      timestamp: new Date().toISOString()
    });
    
    // Listen for success response
    socket.on('recording-start-success', (data) => {
      console.log('Recording started successfully:', data);
      const mediaId = data.mediaId;
      
      // Start actual screen capture
      this.startScreenCapture(socket, roomId, mediaId);
    });
    
    // Listen for errors
    socket.on('recording-start-error', (error) => {
      console.error('Failed to start recording:', error);
    });
  },
  
  // Screen capture implementation
  startScreenCapture: async function(socket, roomId, mediaId) {
    try {
      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      let recordedChunks = [];
      let chunkIndex = 0;
      
      // Handle data available (live chunks)
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
          
          // Send live chunk info to server
          socket.emit('recording-chunk', {
            roomId: roomId,
            mediaId: mediaId,
            userId: socket.id,
            chunkData: null, // Don't send actual data for performance
            timestamp: new Date().toISOString(),
            chunkIndex: chunkIndex++
          });
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = () => {
        // Convert recorded data to base64
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const reader = new FileReader();
        
        reader.onloadend = () => {
          const base64Data = reader.result;
          
          // Save final recording
          socket.emit('update-media-status', {
            mediaId: mediaId,
            status: 'completed',
            endedAt: new Date().toISOString(),
            duration: Math.floor((Date.now() - startTime) / 1000),
            fileSize: blob.size,
            mediaData: base64Data
          });
        };
        
        reader.readAsDataURL(blob);
      };
      
      // Start recording
      const startTime = Date.now();
      mediaRecorder.start(1000); // Record in 1-second chunks
      
      return { mediaRecorder, stream };
      
    } catch (error) {
      console.error('Error starting screen capture:', error);
    }
  },
  
  // Save digital signature live
  saveSignatureLive: function(socket, roomId, signatureData, signedBy, doctorId, patientId) {
    socket.emit('save-signature-live', {
      roomId: roomId,
      signedBy: signedBy, // 'doctor' or 'patient'
      doctorId: doctorId,
      patientId: patientId,
      signatureData: signatureData, // base64 signature image
      purpose: 'consultation_agreement'
    });
    
    // Listen for success
    socket.on('signature-save-success', (data) => {
      console.log('Signature saved successfully:', data);
    });
    
    // Listen for errors
    socket.on('signature-save-error', (error) => {
      console.error('Failed to save signature:', error);
    });
  },
  
  // Capture and save image live
  captureImageLive: function(socket, roomId, doctorId, patientId, description = '') {
    // Capture from video element or camera
    const video = document.querySelector('video'); // Your video element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/png');
    const fileName = `capture_${Date.now()}.png`;
    
    // Save via socket
    socket.emit('save-image-live', {
      roomId: roomId,
      doctorId: doctorId,
      patientId: patientId,
      imageData: imageData,
      fileName: fileName,
      description: description
    });
    
    // Listen for success
    socket.on('image-save-success', (data) => {
      console.log('Image captured successfully:', data);
    });
    
    // Listen for errors
    socket.on('image-save-error', (error) => {
      console.error('Failed to save image:', error);
    });
  },
  
  // Save any media type using unified endpoint
  saveMediaUnified: function(socket, mediaData) {
    socket.emit('save-media', {
      roomId: mediaData.roomId,
      mediaType: mediaData.mediaType, // 'screen_recording', 'digital_signature', 'captured_image'
      doctorId: mediaData.doctorId,
      patientId: mediaData.patientId,
      mediaData: mediaData.data, // base64 or file path
      fileName: mediaData.fileName,
      metadata: mediaData.metadata || {},
      // Additional fields based on media type
      ...mediaData.additionalFields
    });
    
    // Listen for responses
    socket.on('media-save-success', (data) => {
      console.log('Media saved successfully:', data);
    });
    
    socket.on('media-save-error', (error) => {
      console.error('Failed to save media:', error);
    });
  },
  
  // Listen for live media events from other users
  setupLiveMediaListeners: function(socket) {
    // Recording events
    socket.on('recording-started', (data) => {
      console.log('Recording started by another user:', data);
      // Update UI to show recording indicator
    });
    
    socket.on('recording-chunk-received', (data) => {
      console.log('Recording chunk received:', data);
      // Update progress indicator
    });
    
    socket.on('media-status-updated', (data) => {
      console.log('Media status updated:', data);
      // Update UI based on status
    });
    
    // Signature events
    socket.on('signature-saved-live', (data) => {
      console.log('Signature saved by another user:', data);
      // Update signature list or UI
    });
    
    // Image events
    socket.on('image-captured-live', (data) => {
      console.log('Image captured by another user:', data);
      // Update image gallery or UI
    });
    
    // General media events
    socket.on('media-saved', (data) => {
      console.log('Media saved by another user:', data);
      // Refresh media list or update UI
    });
  }
};

// Example API usage (REST endpoints)
const exampleAPIUsage = {
  
  // Save media via REST API
  saveMediaREST: async function(mediaData) {
    try {
      const response = await fetch('/api/media/save-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          roomId: mediaData.roomId,
          mediaType: mediaData.mediaType,
          doctorId: mediaData.doctorId,
          patientId: mediaData.patientId,
          mediaData: mediaData.data,
          fileName: mediaData.fileName,
          // Type-specific fields
          signedBy: mediaData.signedBy,
          purpose: mediaData.purpose,
          description: mediaData.description,
          duration: mediaData.duration,
          fileSize: mediaData.fileSize
        })
      });
      
      const result = await response.json();
      console.log('Media saved via REST:', result);
      return result;
      
    } catch (error) {
      console.error('Error saving media via REST:', error);
    }
  },
  
  // Get room media
  getRoomMedia: async function(roomId, role, userId) {
    try {
      const response = await fetch(`/api/media/room/${roomId}/unified?role=${role}&userId=${userId}`);
      const result = await response.json();
      console.log('Room media retrieved:', result);
      return result.data;
      
    } catch (error) {
      console.error('Error fetching room media:', error);
    }
  },
  
  // Update media status
  updateMediaStatus: async function(mediaId, status, additionalData = {}) {
    try {
      const response = await fetch(`/api/media/media/${mediaId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: status,
          ...additionalData
        })
      });
      
      const result = await response.json();
      console.log('Media status updated:', result);
      return result;
      
    } catch (error) {
      console.error('Error updating media status:', error);
    }
  }
};

// Complete example usage
const completeExample = {
  
  // Initialize consultation session
  initSession: function(roomId, userRole, userInfo) {
    const socket = exampleSocketUsage.initSocket(roomId, userInfo);
    
    // Setup live media listeners
    exampleSocketUsage.setupLiveMediaListeners(socket);
    
    return socket;
  },
  
  // Doctor starts recording session
  doctorStartRecording: function(socket, roomId, doctorId, patientId) {
    if (confirm('Start recording this consultation?')) {
      exampleSocketUsage.startScreenRecording(socket, roomId, doctorId, patientId);
    }
  },
  
  // Patient signs consultation agreement
  patientSignAgreement: function(socket, roomId, patientId, signatureData) {
    exampleSocketUsage.saveSignatureLive(
      socket, 
      roomId, 
      signatureData, 
      'patient', 
      null, 
      patientId
    );
  },
  
  // Doctor captures important moment
  doctorCaptureImage: function(socket, roomId, doctorId, patientId, description) {
    exampleSocketUsage.captureImageLive(
      socket, 
      roomId, 
      doctorId, 
      patientId, 
      description
    );
  }
};

// Export for use in frontend
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exampleSocketUsage,
    exampleAPIUsage,
    completeExample
  };
}

console.log('Live Media Saving Examples loaded successfully!');
console.log('Use exampleSocketUsage, exampleAPIUsage, or completeExample for implementation guidance.');
