/**
 * CHUNKED UPLOAD EXAMPLE - Frontend Implementation
 * 
 * This example shows how to implement chunked upload for large recordings
 * to avoid 413 Request Entity Too Large errors.
 */

// Example frontend implementation
const chunkedUploadExample = {
  
  // Upload recording in chunks
  async uploadRecordingInChunks(recordingBlob, roomId, doctorId, patientId) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const recordingId = `recording_${roomId}_${Date.now()}`;
    
    // Convert blob to base64
    const base64Data = await this.blobToBase64(recordingBlob);
    
    // Calculate number of chunks
    const totalChunks = Math.ceil(base64Data.length / CHUNK_SIZE);
    
    console.log(`Uploading recording in ${totalChunks} chunks of ${CHUNK_SIZE} bytes each`);
    
    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, base64Data.length);
      const chunk = base64Data.substring(start, end);
      
      try {
        const response = await fetch('/api/media/upload-recording-chunk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId: roomId,
            recordingId: recordingId,
            chunkIndex: i,
            totalChunks: totalChunks,
            chunkData: `data:video/webm;base64,${chunk}`,
            fileName: `recording_${roomId}_${Date.now()}.webm`,
            doctorId: doctorId,
            patientId: patientId
          })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Chunk upload failed');
        }
        
        console.log(`Chunk ${i + 1}/${totalChunks} uploaded:`, result.data.progress + '%');
        
        // If this is the last chunk, return the final result
        if (i === totalChunks - 1) {
          console.log('Recording upload completed:', result);
          return result;
        }
        
      } catch (error) {
        console.error(`Error uploading chunk ${i + 1}:`, error);
        throw error;
      }
    }
  },
  
  // Convert blob to base64
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:video/webm;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },
  
  // Example usage in MediaRecorder
  async startRecordingWithChunkedUpload(roomId, doctorId, patientId) {
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
      
      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        try {
          // Create blob from recorded chunks
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          
          console.log(`Recording completed. Size: ${blob.size} bytes`);
          
          // Upload using chunked upload
          const result = await this.uploadRecordingInChunks(blob, roomId, doctorId, patientId);
          
          console.log('Recording saved successfully:', result);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          
        } catch (error) {
          console.error('Error saving recording:', error);
        }
      };
      
      // Start recording
      mediaRecorder.start(1000); // Record in 1-second chunks
      
      return mediaRecorder;
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }
};

// Usage example:
/*
// Start recording with chunked upload
const mediaRecorder = await chunkedUploadExample.startRecordingWithChunkedUpload(
  'room123', 
  'doctor-uuid', 
  'patient-uuid'
);

// Stop recording after some time
setTimeout(() => {
  mediaRecorder.stop();
}, 30000); // Record for 30 seconds
*/

module.exports = chunkedUploadExample;
