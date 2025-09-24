#!/bin/bash

# Email API cURL Test Commands
# Video Consultation System - Email Service Testing

echo "🚀 Starting Email API Tests..."
echo "================================"

# Base URL for email API
BASE_URL="http://localhost:3001/api/email"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_test() {
    echo -e "${BLUE}🧪 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Test 1: Email Configuration Test
print_test "Test 1: Email Configuration"
echo "Command: curl -X GET $BASE_URL/test-config"
echo ""

curl -X GET "$BASE_URL/test-config" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s | jq '.'

echo ""
echo "================================"

# Test 2: Send Meeting Link Email
print_test "Test 2: Send Meeting Link Email"
echo "Command: curl -X POST $BASE_URL/send-meeting-link"
echo ""

curl -X POST "$BASE_URL/send-meeting-link" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "to": "test@example.com",
    "doctorName": "Dr. John Smith",
    "patientName": "Jane Doe",
    "meetingLink": "http://localhost:3000/room/test-room-123",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "14:00",
    "roomId": "test-room-123",
    "customMessage": "Please prepare your medical documents and join the meeting 5 minutes early."
  }' | jq '.'

echo ""
echo "================================"

# Test 3: Send Confirmation Email
print_test "Test 3: Send Confirmation Email"
echo "Command: curl -X POST $BASE_URL/send-confirmation"
echo ""

curl -X POST "$BASE_URL/send-confirmation" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
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
  }' | jq '.'

echo ""
echo "================================"

# Test 4: Send Reminder Email (1 hour)
print_test "Test 4: Send Reminder Email (1 Hour Before)"
echo "Command: curl -X POST $BASE_URL/send-reminder"
echo ""

curl -X POST "$BASE_URL/send-reminder" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Michael Brown",
    "patientName": "Alice Johnson",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "16:00",
    "meetingLink": "http://localhost:3000/room/reminder-789",
    "roomId": "reminder-789",
    "reminderType": "1hour"
  }' | jq '.'

echo ""
echo "================================"

# Test 5: Send Reminder Email (15 minutes)
print_test "Test 5: Send Reminder Email (15 Minutes Before)"
echo "Command: curl -X POST $BASE_URL/send-reminder"
echo ""

curl -X POST "$BASE_URL/send-reminder" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "to": "patient@example.com",
    "doctorName": "Dr. Lisa Chen",
    "patientName": "Bob Wilson",
    "appointmentDate": "2025-09-25",
    "appointmentTime": "17:15",
    "meetingLink": "http://localhost:3000/room/urgent-456",
    "roomId": "urgent-456",
    "reminderType": "15min"
  }' | jq '.'

echo ""
echo "================================"

# Test 6: Send Custom Email
print_test "Test 6: Send Custom Email"
echo "Command: curl -X POST $BASE_URL/send-custom"
echo ""

curl -X POST "$BASE_URL/send-custom" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Important Update About Your Consultation",
    "message": "Dear Patient,\n\nWe wanted to inform you about an important update regarding your upcoming consultation.\n\nPlease review the attached information and contact us if you have any questions.\n\nBest regards,\nMedical Team",
    "fromName": "Medical Center"
  }' | jq '.'

echo ""
echo "================================"

# Test 7: Error Test - Missing Required Fields
print_test "Test 7: Error Test - Missing Required Fields"
echo "Command: curl -X POST $BASE_URL/send-meeting-link (with missing fields)"
echo ""

curl -X POST "$BASE_URL/send-meeting-link" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n" \
  -d '{
    "doctorName": "Dr. Test"
  }' | jq '.'

echo ""
echo "================================"

# Test 8: Send Meeting Link with Real Email (Interactive)
print_test "Test 8: Send Meeting Link with Real Email (Interactive)"
echo ""
print_info "Enter your email address to receive a test meeting link:"
read -p "Email: " USER_EMAIL

if [ ! -z "$USER_EMAIL" ]; then
    echo "Sending meeting link to: $USER_EMAIL"
    
    curl -X POST "$BASE_URL/send-meeting-link" \
      -H "Content-Type: application/json" \
      -w "\nHTTP Status: %{http_code}\n" \
      -d "{
        \"to\": \"$USER_EMAIL\",
        \"doctorName\": \"Dr. Test Doctor\",
        \"patientName\": \"Test Patient\",
        \"meetingLink\": \"http://localhost:3000/room/live-test-$(date +%s)\",
        \"appointmentDate\": \"$(date '+%Y-%m-%d')\",
        \"appointmentTime\": \"$(date '+%H:%M')\",
        \"roomId\": \"live-test-$(date +%s)\",
        \"customMessage\": \"This is a test email sent via cURL command at $(date)\"
      }" | jq '.'
    
    print_success "Test email sent! Check your inbox at $USER_EMAIL"
else
    print_info "Skipped interactive test (no email provided)"
fi

echo ""
echo "================================"
print_success "All Email API Tests Completed!"
echo ""
print_info "Notes:"
echo "- Make sure your backend server is running on port 3001"
echo "- Ensure EMAIL_USER and EMAIL_PASS environment variables are set"
echo "- Check your email inbox for test emails"
echo "- All endpoints return JSON responses"
echo ""
print_info "Environment Variables Needed:"
echo "export EMAIL_USER=\"aman367787@gmail.com\""
echo "export EMAIL_PASS=\"zhtmlmlatiepjgnc\""
