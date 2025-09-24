# Location API Testing Commands

## Location Tracking System - cURL Commands

### Prerequisites
1. Backend server running on `http://localhost:3001`
2. Database with Location model created
3. At least one room created in the system

## API Endpoints

### 1. Save Location Data

#### Save Patient Location
```bash
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "role": "patient",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "New Delhi, India",
    "accuracy": 20.5
  }'
```

#### Save Doctor Location
```bash
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "role": "doctor", 
    "latitude": 28.7041,
    "longitude": 77.1025,
    "address": "Gurgaon, India",
    "accuracy": 15.2
  }'
```

### 2. Get Room Location Data
```bash
curl -X GET http://localhost:3001/api/location/room/test-room-123
```

### 3. Get Current Location (Helper)
```bash
curl -X POST http://localhost:3001/api/location/get-current \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### 4. Update Location Status
```bash
curl -X PATCH http://localhost:3001/api/location/status \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "status": "completed"
  }'
```

### 5. Get All Rooms Location Data
```bash
curl -X GET http://localhost:3001/api/location/all-rooms
```

## Test Scenarios

### Scenario 1: Complete Patient Journey
```bash
# 1. Create a room first (if needed)
curl -X POST http://localhost:3001/api/rooms/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DOCTOR_TOKEN" \
  -d '{"roomName": "Patient Location Test"}'

# 2. Save patient location
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "ROOM_ID_FROM_STEP_1",
    "role": "patient",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "accuracy": 25.0
  }'

# 3. Save doctor location
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "ROOM_ID_FROM_STEP_1",
    "role": "doctor",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "accuracy": 18.5
  }'

# 4. Get combined location data
curl -X GET http://localhost:3001/api/location/room/ROOM_ID_FROM_STEP_1
```

### Scenario 2: Location Updates
```bash
# Update patient location (patient moved)
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "role": "patient",
    "latitude": 28.6200,
    "longitude": 77.2150,
    "accuracy": 30.0
  }'

# Check updated location
curl -X GET http://localhost:3001/api/location/room/test-room-123
```

## Expected Responses

### Successful Location Save
```json
{
  "success": true,
  "message": "patient location saved successfully",
  "data": {
    "locationId": "uuid-here",
    "roomId": "test-room-123",
    "role": "patient",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "address": "Lat: 28.613900, Lng: 77.209000",
    "accuracy": 20.5,
    "distanceKm": null,
    "timestamp": "2025-09-24T15:30:00.000Z"
  }
}
```

### Room Location Data (Both Locations)
```json
{
  "success": true,
  "message": "Location data retrieved successfully",
  "data": {
    "roomId": "test-room-123",
    "patient": {
      "latitude": 28.6139,
      "longitude": 77.2090,
      "address": "Lat: 28.613900, Lng: 77.209000",
      "timestamp": "2025-09-24T15:30:00.000Z",
      "accuracy": 20.5
    },
    "doctor": {
      "latitude": 28.7041,
      "longitude": 77.1025,
      "address": "Lat: 28.704100, Lng: 77.102500",
      "timestamp": "2025-09-24T15:32:00.000Z",
      "accuracy": 15.2
    },
    "distance": {
      "kilometers": 12.45,
      "miles": 7.74
    },
    "status": "active",
    "lastUpdated": "2025-09-24T15:32:00.000Z"
  }
}
```

## Integration with Frontend

### JavaScript Example (for testing in browser console)
```javascript
// Test location save
const saveLocation = async (roomId, role, lat, lng) => {
  try {
    const response = await fetch('http://localhost:3001/api/location/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomId: roomId,
        role: role,
        latitude: lat,
        longitude: lng,
        accuracy: 20
      })
    });
    
    const result = await response.json();
    console.log('Location saved:', result);
    return result;
  } catch (error) {
    console.error('Error saving location:', error);
  }
};

// Test get location
const getLocation = async (roomId) => {
  try {
    const response = await fetch(`http://localhost:3001/api/location/room/${roomId}`);
    const result = await response.json();
    console.log('Location data:', result);
    return result;
  } catch (error) {
    console.error('Error getting location:', error);
  }
};

// Usage
saveLocation('test-room-123', 'patient', 28.6139, 77.2090);
saveLocation('test-room-123', 'doctor', 28.7041, 77.1025);
getLocation('test-room-123');
```

## Error Scenarios

### Invalid Coordinates
```bash
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "role": "patient",
    "latitude": 200,
    "longitude": 300
  }'
```

### Invalid Role
```bash
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "test-room-123",
    "role": "admin",
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

### Non-existent Room
```bash
curl -X POST http://localhost:3001/api/location/save \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "non-existent-room",
    "role": "patient",
    "latitude": 28.6139,
    "longitude": 77.2090
  }'
```

## Database Schema

The location data is stored with the following structure:
- `roomId`: UUID reference to rooms table
- `patientLatitude`, `patientLongitude`: Patient coordinates
- `doctorLatitude`, `doctorLongitude`: Doctor coordinates  
- `patientAddress`, `doctorAddress`: Readable addresses
- `patientLocationTimestamp`, `doctorLocationTimestamp`: When locations were captured
- `distanceKm`: Calculated distance between doctor and patient
- `status`: active, completed, failed
- `metadata`: Additional location information

## Features

✅ **Automatic Distance Calculation** between doctor and patient  
✅ **Coordinate Validation** (latitude: -90 to 90, longitude: -180 to 180)  
✅ **Role-based Location Tracking** (separate for doctor and patient)  
✅ **Location History** (latest location per room)  
✅ **Address Resolution** (coordinates to readable format)  
✅ **Error Handling** for invalid data  
✅ **Status Tracking** for location recording sessions  

## Testing Checklist

- [ ] Save patient location successfully
- [ ] Save doctor location successfully  
- [ ] Get combined location data for room
- [ ] Verify distance calculation is correct
- [ ] Test coordinate validation (invalid coords)
- [ ] Test role validation (invalid role)
- [ ] Test non-existent room handling
- [ ] Update location status
- [ ] Get all rooms location data
- [ ] Frontend integration working
