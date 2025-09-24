#!/bin/bash

# WebRTC Media API - cURL Test Commands
# Make sure your backend server is running on http://localhost:3001

echo "🚀 WebRTC Media API Test Commands"
echo "=================================="

# 1. Get All Media Data for a Room
echo ""
echo "📊 1. Get All Media Data for Room"
echo "GET /api/media/all-media/:roomId"
curl -X GET \
  "http://localhost:3001/api/media/all-media/room_123" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 2. Capture Image (Doctor)
echo ""
echo "📸 2. Capture Image - Doctor"
echo "POST /api/media/capture-image"
curl -X POST \
  "http://localhost:3001/api/media/capture-image" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "doctorId": "1",
    "patientId": null,
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "fileName": "test_doctor_image.png",
    "capturedBy": "doctor",
    "description": "Test doctor image capture"
  }' \
  | jq '.'

echo ""
echo "=================================="

# 3. Capture Image (Patient)
echo ""
echo "📸 3. Capture Image - Patient"
echo "POST /api/media/capture-image"
curl -X POST \
  "http://localhost:3001/api/media/capture-image" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "doctorId": null,
    "patientId": "1",
    "imageData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "fileName": "test_patient_image.png",
    "capturedBy": "patient",
    "description": "Test patient image capture"
  }' \
  | jq '.'

echo ""
echo "=================================="

# 4. Save Doctor Signature
echo ""
echo "✍️ 4. Save Doctor Signature"
echo "POST /api/media/save-signature"
curl -X POST \
  "http://localhost:3001/api/media/save-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "signedBy": "doctor",
    "doctorId": "1",
    "patientId": null,
    "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "purpose": "consultation_agreement"
  }' \
  | jq '.'

echo ""
echo "=================================="

# 5. Save Patient Signature
echo ""
echo "✍️ 5. Save Patient Signature"
echo "POST /api/media/save-signature"
curl -X POST \
  "http://localhost:3001/api/media/save-signature" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "signedBy": "patient",
    "doctorId": null,
    "patientId": "1",
    "signatureData": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
    "purpose": "consultation_agreement"
  }' \
  | jq '.'

echo ""
echo "=================================="

# 6. Start Recording
echo ""
echo "🎥 6. Start Recording"
echo "POST /api/media/start-recording"
curl -X POST \
  "http://localhost:3001/api/media/start-recording" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room_123",
    "doctorId": "1",
    "patientId": "1"
  }' \
  | jq '.'

echo ""
echo "=================================="

# 7. Save Recording (replace RECORDING_ID with actual ID from step 6)
echo ""
echo "💾 7. Save Recording"
echo "POST /api/media/save-recording"
echo "Note: Replace 'RECORDING_ID' with actual recording ID from step 6"
curl -X POST \
  "http://localhost:3001/api/media/save-recording" \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": "RECORDING_ID",
    "recordingData": "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIcBhEAUQNUH4GQnP8BMTp4GAkCADAAeHA7AA==",
    "duration": 30,
    "fileSize": 1024
  }' \
  | jq '.'

echo ""
echo "=================================="

# 8. Get Images by Role (Doctor)
echo ""
echo "📸 8. Get Doctor Images"
echo "GET /api/media/room/:roomId/images/doctor"
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/images/doctor" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 9. Get Images by Role (Patient)
echo ""
echo "📸 9. Get Patient Images"
echo "GET /api/media/room/:roomId/images/patient"
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/images/patient" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 10. Get Signatures by Role (Doctor)
echo ""
echo "✍️ 10. Get Doctor Signatures"
echo "GET /api/media/room/:roomId/signatures/doctor"
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/signatures/doctor" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 11. Get Signatures by Role (Patient)
echo ""
echo "✍️ 11. Get Patient Signatures"
echo "GET /api/media/room/:roomId/signatures/patient"
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/signatures/patient" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 12. Get Media by Role
echo ""
echo "📊 12. Get Media by Role"
echo "GET /api/media/room/:roomId/media-by-role?requestingRole=doctor"
curl -X GET \
  "http://localhost:3001/api/media/room/room_123/media-by-role?requestingRole=doctor" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "=================================="

# 13. Test Upload Files URL
echo ""
echo "🌐 13. Test Upload Files URL"
echo "GET /api/test-uploads"
curl -X GET \
  "http://localhost:3001/api/test-uploads" \
  -H "Content-Type: application/json" \
  | jq '.'

echo ""
echo "🎉 All API tests completed!"
echo "Note: Make sure to replace 'room_123' with your actual room ID"
echo "Note: Replace RECORDING_ID with actual recording ID from start-recording response"
