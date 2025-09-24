# Quick Email API cURL Commands

## Basic Commands for Testing Email API

### 1. Test Email Configuration
```bash
curl -X GET http://localhost:3001/api/email/test-config
```

### 2. Send Meeting Link (Basic)
```bash
curl -X POST http://localhost:3001/api/email/send-meeting-link \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-email@example.com",
    "doctorName": "Dr. John Smith",
    "patientName": "Jane Doe",
    "meetingLink": "http://localhost:3000/room/test-123",
    "roomId": "test-123"
  }'
```

### 3. Send Meeting Link (Complete)
```bash
curl -X POST http://localhost:3001/api/email/send-meeting-link \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Sarah Wilson",
    "patientName": "John Doe",
    "meetingLink": "http://localhost:3000/room/consultation-456",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "14:30",
    "roomId": "consultation-456",
    "customMessage": "Please bring your medical documents and join 5 minutes early."
  }'
```

### 4. Send Confirmation Email
```bash
curl -X POST http://localhost:3001/api/email/send-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Michael Brown",
    "patientName": "Alice Johnson",
    "consultationType": "Follow-up Consultation",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "15:00"
  }'
```

### 5. Send Reminder (1 Hour Before)
```bash
curl -X POST http://localhost:3001/api/email/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Lisa Chen",
    "patientName": "Bob Wilson",
    "meetingLink": "http://localhost:3000/room/reminder-789",
    "roomId": "reminder-789",
    "reminderType": "1hour"
  }'
```

### 6. Send Reminder (15 Minutes Before)
```bash
curl -X POST http://localhost:3001/api/email/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Emily Davis",
    "patientName": "Carol Smith",
    "meetingLink": "http://localhost:3000/room/urgent-123",
    "roomId": "urgent-123",
    "reminderType": "15min"
  }'
```

### 7. Send Custom Email
```bash
curl -X POST http://localhost:3001/api/email/send-custom \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Your Consultation Results",
    "message": "Dear Patient,\n\nYour consultation results are ready. Please contact our office to discuss the next steps.\n\nBest regards,\nMedical Team"
  }'
```

## One-Line Commands

### Quick Test (Replace with your email)
```bash
curl -X POST http://localhost:3001/api/email/send-meeting-link -H "Content-Type: application/json" -d '{"to":"your-email@gmail.com","doctorName":"Dr.Test","patientName":"Test Patient","meetingLink":"http://localhost:3000/room/test","roomId":"test"}'
```

### Quick Config Test
```bash
curl -X GET http://localhost:3001/api/email/test-config | jq
```

## Environment Setup

Before running commands, set these environment variables:

```bash
export EMAIL_USER="aman367787@gmail.com"
export EMAIL_PASS="zhtmlmlatiepjgnc"
```

Or create a `.env` file in the backend directory:
```env
EMAIL_USER=aman367787@gmail.com
EMAIL_PASS=zhtmlmlatiepjgnc
```

## Success Response Example
```json
{
  "success": true,
  "message": "Meeting link sent successfully",
  "data": {
    "to": "patient@example.com",
    "messageId": "<message-id>",
    "roomId": "test-123",
    "sentAt": "2025-09-24T15:30:00.000Z"
  }
}
```

## Error Response Example
```json
{
  "success": false,
  "message": "Failed to send meeting link email",
  "error": "Authentication failed"
}
```

## Quick Testing Steps

1. **Start Backend Server**:
   ```bash
   cd backend
   npm start
   ```

2. **Test Configuration**:
   ```bash
   curl -X GET http://localhost:3001/api/email/test-config
   ```

3. **Send Test Email** (replace with your email):
   ```bash
   curl -X POST http://localhost:3001/api/email/send-meeting-link \
     -H "Content-Type: application/json" \
     -d '{"to":"your-email@gmail.com","doctorName":"Dr. Test","meetingLink":"http://localhost:3000/room/test","roomId":"test"}'
   ```

4. **Check Your Email Inbox** for the meeting link email
