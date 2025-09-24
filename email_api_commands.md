# Email API Commands - Video Consultation System

This document contains cURL commands to test the email functionality of the video consultation system.

## Prerequisites

1. Make sure the backend server is running on `http://localhost:3001`
2. Ensure nodemailer is installed: `npm install nodemailer`
3. Set environment variables:
   ```bash
   export EMAIL_USER="aman367787@gmail.com"
   export EMAIL_PASS="zhtmlmlatiepjgnc"
   ```

## API Endpoints

### 1. Test Email Configuration

```bash
curl -X GET http://localhost:3001/api/email/test-config \
  -H "Content-Type: application/json"
```

### 2. Send Meeting Link Email

```bash
curl -X POST http://localhost:3001/api/email/send-meeting-link \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "doctorName": "Dr. John Smith",
    "patientName": "Jane Doe",
    "meetingLink": "http://localhost:3000/room/test-room-123",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "14:00",
    "roomId": "test-room-123",
    "customMessage": "Please prepare your medical documents and join the meeting 5 minutes early."
  }'
```

### 3. Send Confirmation Email

```bash
curl -X POST http://localhost:3001/api/email/send-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Sarah Wilson",
    "patientName": "John Doe",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "15:30",
    "consultationType": "General Consultation",
    "meetingLink": "http://localhost:3000/room/consultation-456",
    "roomId": "consultation-456",
    "instructions": "Please bring your insurance card and medical history."
  }'
```

### 4. Send Reminder Email

```bash
curl -X POST http://localhost:3001/api/email/send-reminder \
  -H "Content-Type: application/json" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Michael Brown",
    "patientName": "Alice Johnson",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "16:00",
    "meetingLink": "http://localhost:3000/room/reminder-789",
    "roomId": "reminder-789",
    "reminderType": "1hour"
  }'
```

### 5. Send Custom Email

```bash
curl -X POST http://localhost:3001/api/email/send-custom \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Important Update About Your Consultation",
    "message": "Dear Patient,\n\nWe wanted to inform you about an important update regarding your upcoming consultation.\n\nPlease review the attached information and contact us if you have any questions.\n\nBest regards,\nMedical Team",
    "fromName": "Medical Center"
  }'
```

## Response Examples

### Success Response
```json
{
  "success": true,
  "message": "Meeting link sent successfully",
  "data": {
    "to": "test@example.com",
    "messageId": "<unique-message-id>",
    "roomId": "test-room-123",
    "sentAt": "2025-09-24T12:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Failed to send meeting link email",
  "error": "Invalid credentials"
}
```

## Environment Variables

Create a `.env` file in the backend directory with:

```env
# Email Configuration
EMAIL_USER=aman367787@gmail.com
EMAIL_PASS=zhtmlmlatiepjgnc

# Server Configuration
PORT=3001

# Application URL (for generating meeting links)
APP_URL=http://localhost:3000
```

## Integration Examples

### Sending Meeting Link When Room is Created

```javascript
// In your room creation logic
const { data: room } = await api.post('/api/rooms/create', roomData);

// Send meeting link email
await api.post('/api/email/send-meeting-link', {
  to: patientEmail,
  doctorName: doctorName,
  patientName: patientName,
  meetingLink: `${window.location.origin}/room/${room.roomId}`,
  roomId: room.roomId,
  appointmentDate: appointmentDate,
  appointmentTime: appointmentTime
});
```

### Sending Confirmation After Booking

```javascript
// After successful booking
await api.post('/api/email/send-confirmation', {
  to: patientEmail,
  doctorName: selectedDoctor.name,
  patientName: patientName,
  consultationType: 'General Consultation',
  appointmentDate: bookingDate,
  appointmentTime: bookingTime,
  meetingLink: meetingUrl,
  roomId: roomId
});
```

### Automated Reminders

```javascript
// Schedule reminders (you can use node-cron or similar)
// 1 hour before
setTimeout(() => {
  api.post('/api/email/send-reminder', {
    to: patientEmail,
    reminderType: '1hour',
    meetingLink: meetingUrl,
    doctorName: doctorName,
    patientName: patientName,
    roomId: roomId
  });
}, reminderTime);
```

## Testing

1. Open the test file: `test_email_api.html` in your browser
2. Fill in the email fields with your test email address
3. Click the test buttons to send emails
4. Check your email inbox for the received emails

## Troubleshooting

1. **Authentication Error**: Make sure the email credentials are correct
2. **Network Error**: Ensure the backend server is running
3. **Gmail Security**: You may need to enable "Less secure app access" or use App Passwords
4. **CORS Issues**: Make sure CORS is properly configured in the server

## Notes

- All emails are sent as HTML with beautiful templates
- The system supports both plain text and HTML email content
- Email templates are responsive and mobile-friendly
- All endpoints include proper error handling and validation
