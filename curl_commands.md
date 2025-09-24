# WebRTC Media API - cURL Commands

## 🎯 Main Endpoint - Get All Media Data

### Get All Room Media
```bash
curl -X GET \
  "http://localhost:3001/api/media/all-media/room_123" \
  -H "Content-Type: application/json"
```

## 📸 Image Capture

### Capture Doctor Image
```bash
curl -X POST \
  "http://localhost:3001/api/media/capture-image" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "doctorId": "1",
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "fileName": "doctor_test.png",
    "capturedBy": "doctor",
    "description": "Test doctor image"
  }'
```

### Capture Patient Image
```bash
curl -X POST \
  "http://localhost:3001/api/media/capture-image" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "patientId": "1",
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "fileName": "patient_test.png",
    "capturedBy": "patient",
    "description": "Test patient image"
  }'
```

## ✍️ Digital Signatures

### Save Doctor Signature
```bash
curl -X POST \
  "http://localhost:3001/api/media/save-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "signedBy": "doctor",
    "doctorId": "1",
    "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "purpose": "consultation_agreement"
  }'
```

### Save Patient Signature
```bash
curl -X POST \
  "http://localhost:3001/api/media/save-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "signedBy": "patient",
    "patientId": "1",
    "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "purpose": "consultation_agreement"
  }'
```

## 🎥 Screen Recording

### Start Recording
```bash
curl -X POST \
  "http://localhost:3001/api/media/start-recording" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "doctorId": "1",
    "patientId": "1"
  }'
```

### Save Recording
```bash
# Replace RECORDING_ID with actual ID from start-recording response
curl -X POST \
  "http://localhost:3001/api/media/save-recording" \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": "RECORDING_ID_HERE",
    "recordingData": "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIcBhEAUQNUH4GQnP8BMTp4GAkCADAAeHA7AA==",
    "duration": 30,
    "fileSize": 1024
  }'
```

## 🔍 Get Data by Role

### Get Doctor Images
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/images/doctor"
```

### Get Patient Images
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/images/patient"
```

### Get Doctor Signatures
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/signatures/doctor"
```

### Get Patient Signatures
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/signatures/patient"
```

### Get Media by Role (Doctor View)
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/media-by-role?requestingRole=doctor"
```

### Get Media by Role (Patient View)
```bash
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/media-by-role?requestingRole=patient"
```

## 🌐 Test Uploads

### Test Upload URLs
```bash
curl -X GET \
  "http://localhost:3001/api/test-uploads"
```

### Health Check
```bash
curl -X GET \
  "http://localhost:3001/api/health"
```

---

## 📝 Quick Usage Instructions

1. **Start your backend server:**
   ```bash
   cd backend && npm start
   ```

2. **Run full test suite:**
   ```bash
   ./test_api_calls.sh
   ```

3. **Test main endpoint:**
   ```bash
   curl -X GET "http://localhost:3001/api/media/all-media/room_123" | jq '.'
   ```

## 📊 Expected Response Format

The main endpoint returns:
```json
{
  "success": true,
  "data": {
    "roomId": "room_123",
    "recordings": [...],
    "doctorSignatures": [...],
    "patientSignatures": [...],
    "doctorImages": [...],
    "patientImages": [...],
    "summary": {
      "totalRecordings": 1,
      "totalDoctorSignatures": 1,
      "totalPatientSignatures": 1,
      "totalDoctorImages": 1,
      "totalPatientImages": 1,
      "totalMediaItems": 5
    }
  },
  "message": "All media data retrieved for room room_123"
}
```

## 🔧 Notes

- Replace `room_123` with your actual room ID
- Replace `RECORDING_ID_HERE` with actual recording ID from start-recording response
- Make sure jq is installed for pretty JSON output: `brew install jq` (macOS) or `apt-get install jq` (Ubuntu)
- All media files are accessible at: `http://localhost:3001/uploads/filename`
