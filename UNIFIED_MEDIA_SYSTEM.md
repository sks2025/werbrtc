# Unified Media System - WebRTC Video Consultation

## Overview

The unified media system allows saving screen recordings, digital signatures, and captured photos in a single database table with real-time Socket.io communication. All media is linked to a specific room ID and supports live streaming and real-time updates.

## Features

✅ **Unified Storage**: All media types (recordings, signatures, photos) in one table
✅ **Real-time Saving**: Live updates via Socket.io
✅ **Live Streaming Support**: Track recording chunks in real-time
✅ **Role-based Access**: Doctors can access all media, patients have restricted access
✅ **Metadata Support**: Flexible JSON metadata for each media item
✅ **Status Tracking**: Recording, completed, failed, processing states

## Database Schema

### RoomMedia Table
```sql
CREATE TABLE "RoomMedia" (
    "id" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId"),
    "mediaType" VARCHAR(50) CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
    "doctorId" INTEGER REFERENCES "Doctors"("doctorId"),
    "patientId" INTEGER REFERENCES "Patients"("patientId"),
    "mediaData" TEXT NOT NULL, -- Base64 data or file path
    "fileName" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}',
    
    -- Type-specific fields
    "duration" INTEGER, -- For recordings
    "fileSize" INTEGER,
    "startedAt" TIMESTAMP,
    "endedAt" TIMESTAMP,
    "signedBy" VARCHAR(10), -- For signatures
    "purpose" VARCHAR(255),
    "description" TEXT, -- For images
    
    -- Common fields
    "status" VARCHAR(20) DEFAULT 'completed',
    "capturedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "isLiveStreaming" BOOLEAN DEFAULT false,
    "liveChunks" JSONB DEFAULT '[]'
);
```

## API Endpoints

### REST API

#### Save Any Media Type
```http
POST /api/media/save-media
Content-Type: application/json

{
  "roomId": "room_123",
  "mediaType": "screen_recording", // or "digital_signature", "captured_image"
  "doctorId": "doctor_uuid",
  "patientId": "patient_uuid", 
  "mediaData": "base64_data_here",
  "fileName": "recording.webm",
  // Type-specific fields...
}
```

#### Get Room Media (Unified)
```http
GET /api/media/room/{roomId}/unified?role=doctor&userId=user123&mediaType=screen_recording
```

#### Update Media Status
```http
PATCH /api/media/media/{mediaId}/status
Content-Type: application/json

{
  "status": "completed",
  "endedAt": "2024-01-01T12:00:00Z",
  "duration": 300,
  "fileSize": 1024000,
  "mediaData": "final_base64_data"
}
```

### Socket.io Events

#### Start Recording (Live)
```javascript
socket.emit('start-recording', {
  roomId: 'room_123',
  recordingId: 'rec_123',
  doctorId: 'doctor_uuid',
  patientId: 'patient_uuid',
  timestamp: new Date().toISOString()
});

// Listen for response
socket.on('recording-start-success', (data) => {
  console.log('Recording started:', data.mediaId);
});
```

#### Save Media (Live)
```javascript
socket.emit('save-media', {
  roomId: 'room_123',
  mediaType: 'digital_signature',
  doctorId: 'doctor_uuid',
  patientId: 'patient_uuid',
  mediaData: 'base64_signature_data',
  signedBy: 'patient',
  purpose: 'consultation_agreement'
});
```

#### Live Recording Chunks
```javascript
socket.emit('recording-chunk', {
  roomId: 'room_123',
  mediaId: 'media_id',
  userId: 'user_123',
  chunkData: null, // For performance
  timestamp: new Date().toISOString(),
  chunkIndex: 5
});
```

#### Quick Save Methods
```javascript
// Save signature live
socket.emit('save-signature-live', {
  roomId: 'room_123',
  signedBy: 'patient',
  patientId: 'patient_uuid',
  signatureData: 'base64_signature'
});

// Save image live  
socket.emit('save-image-live', {
  roomId: 'room_123',
  doctorId: 'doctor_uuid',
  patientId: 'patient_uuid',
  imageData: 'base64_image',
  fileName: 'capture.png',
  description: 'Important finding'
});
```

#### Update Media Status
```javascript
socket.emit('update-media-status', {
  mediaId: 'media_123',
  status: 'completed',
  endedAt: new Date().toISOString(),
  mediaData: 'final_recording_data'
});
```

## Real-time Event Listeners

```javascript
// Recording events
socket.on('recording-started', (data) => {
  // Another user started recording
});

socket.on('recording-chunk-received', (data) => {
  // Live chunk progress update
});

socket.on('media-status-updated', (data) => {
  // Media status changed
});

// Media saved events
socket.on('media-saved', (data) => {
  // Any media type was saved
});

socket.on('signature-saved-live', (data) => {
  // Signature was saved
});

socket.on('image-captured-live', (data) => {
  // Image was captured
});
```

## Frontend Implementation Example

### 1. Initialize Socket
```javascript
const socket = io('http://localhost:3001');
socket.emit('join-room', {
  roomId: 'room_123',
  role: 'doctor',
  userInfo: { name: 'Dr. Smith', email: 'dr@example.com' }
});
```

### 2. Start Screen Recording
```javascript
// Start recording in database
socket.emit('start-recording', {
  roomId: 'room_123',
  recordingId: `rec_${Date.now()}`,
  doctorId: 'doctor_uuid',
  patientId: 'patient_uuid',
  timestamp: new Date().toISOString()
});

// Get mediaId from response and start actual recording
socket.on('recording-start-success', (data) => {
  startScreenCapture(data.mediaId);
});
```

### 3. Capture Screen
```javascript
async function startScreenCapture(mediaId) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: true, audio: true
  });
  
  const mediaRecorder = new MediaRecorder(stream);
  let chunks = [];
  
  mediaRecorder.ondataavailable = (event) => {
    chunks.push(event.data);
    
    // Send chunk info (not data for performance)
    socket.emit('recording-chunk', {
      roomId: 'room_123',
      mediaId: mediaId,
      chunkIndex: chunks.length,
      timestamp: new Date().toISOString()
    });
  };
  
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks);
    const reader = new FileReader();
    
    reader.onloadend = () => {
      // Save final recording
      socket.emit('update-media-status', {
        mediaId: mediaId,
        status: 'completed',
        mediaData: reader.result,
        duration: recordingDuration,
        fileSize: blob.size
      });
    };
    
    reader.readAsDataURL(blob);
  };
  
  mediaRecorder.start(1000); // 1-second chunks
}
```

### 4. Save Signature
```javascript
function saveSignature(signatureCanvas, signedBy) {
  const signatureData = signatureCanvas.toDataURL();
  
  socket.emit('save-signature-live', {
    roomId: 'room_123',
    signedBy: signedBy,
    doctorId: signedBy === 'doctor' ? 'doctor_uuid' : null,
    patientId: signedBy === 'patient' ? 'patient_uuid' : null,
    signatureData: signatureData
  });
}
```

### 5. Capture Image
```javascript
function captureImage(videoElement, description) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  ctx.drawImage(videoElement, 0, 0);
  
  const imageData = canvas.toDataURL('image/png');
  
  socket.emit('save-image-live', {
    roomId: 'room_123',
    doctorId: 'doctor_uuid',
    patientId: 'patient_uuid',
    imageData: imageData,
    fileName: `capture_${Date.now()}.png`,
    description: description
  });
}
```

## Database Migration

Run the updated `setup-database.sql` to create the new `RoomMedia` table:

```bash
psql -d webrtc_consultation -f setup-database.sql
```

The system will automatically sync the new table when you restart the server.

## Migration from Old System

The old separate tables (`CapturedImage`, `DigitalSignature`, `ScreenRecording`) still exist and work. The new unified system runs alongside them. You can migrate data later or keep both systems running.

## Performance Considerations

1. **Live Chunks**: Only metadata is stored, not actual chunk data
2. **Base64 Storage**: Consider file storage for large recordings
3. **Indexing**: Proper indexes on roomId, mediaType, and timestamps
4. **Real-time Updates**: Socket events are lightweight and efficient

## Security

- Role-based access control (doctors see all, patients restricted)
- All media linked to authenticated users
- Socket events validate room membership
- Media data can be encrypted before storage

## Usage Tips

1. Use the unified `save-media` endpoint for consistency
2. Listen to all live events for real-time UI updates
3. Handle errors gracefully with error event listeners
4. Use the `metadata` field for custom properties
5. Monitor `isLiveStreaming` status for active recordings

## Complete Example

See `live-media-example.js` for a complete implementation example with all features demonstrated.
