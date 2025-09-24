# Admin API - cURL Commands

## 🔐 Admin Authentication

### Admin Login
```bash
curl -X POST "http://localhost:3001/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "Admin@123"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@gmail.com",
      "name": "System Administrator",
      "role": "admin",
      "lastLogin": "2025-09-24T..."
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### Test Admin Endpoint
```bash
curl -X GET "http://localhost:3001/api/admin/test"
```

## 🔒 Protected Admin Routes

**Note:** Replace `YOUR_JWT_TOKEN` with the actual token received from login.

### Get Admin Profile
```bash
curl -X GET "http://localhost:3001/api/admin/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Get Dashboard Stats
```bash
curl -X GET "http://localhost:3001/api/admin/dashboard" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Admin Logout
```bash
curl -X POST "http://localhost:3001/api/admin/logout" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## 🧪 Complete Test Sequence

### 1. First, test the admin endpoint
```bash
curl -X GET "http://localhost:3001/api/admin/test"
```

### 2. Login and save the token
```bash
# Login and extract token
TOKEN=$(curl -s -X POST "http://localhost:3001/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "Admin@123"
  }' | jq -r '.data.token')

echo "Token: $TOKEN"
```

### 3. Use the token for protected routes
```bash
# Get admin profile
curl -X GET "http://localhost:3001/api/admin/profile" \
  -H "Authorization: Bearer $TOKEN"

# Get dashboard stats
curl -X GET "http://localhost:3001/api/admin/dashboard" \
  -H "Authorization: Bearer $TOKEN"
```

## 🚨 Error Testing

### Invalid Credentials
```bash
curl -X POST "http://localhost:3001/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "wrongpassword"
  }'
```

### Access Protected Route Without Token
```bash
curl -X GET "http://localhost:3001/api/admin/profile"
```

### Access Protected Route With Invalid Token
```bash
curl -X GET "http://localhost:3001/api/admin/profile" \
  -H "Authorization: Bearer invalid_token_here"
```

## 📊 Dashboard Stats Response Example

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalDoctors": 2,
      "totalPatients": 5,
      "totalRooms": 8,
      "totalConsultations": 12,
      "totalImages": 15,
      "totalSignatures": 10
    },
    "active": {
      "activeDoctors": 2,
      "activeRooms": 3
    },
    "recentActivity": {
      "newRoomsThisWeek": 2,
      "newConsultationsThisWeek": 5
    },
    "lastUpdated": "2025-09-24T12:30:45.123Z"
  },
  "message": "Dashboard stats retrieved successfully"
}
```

## 🔑 Admin Credentials

**Default Admin Account:**
- **Email:** admin@gmail.com
- **Password:** Admin@123
- **Role:** admin

**Features:**
- ✅ JWT-based authentication
- ✅ 24-hour token expiry
- ✅ Password hashing with bcryptjs
- ✅ Protected routes with middleware
- ✅ Dashboard statistics
- ✅ Admin profile management
- ✅ Automatic admin creation on server start

## 🛡️ Security Features

1. **Password Hashing:** Uses bcryptjs with salt rounds
2. **JWT Tokens:** 24-hour expiry with role verification
3. **Input Validation:** Email and password validation
4. **Role-based Access:** Admin role required for protected routes
5. **Error Handling:** Secure error messages without sensitive data leakage

## 📝 Usage Instructions

1. **Start Backend Server:**
   ```bash
   cd backend && npm start
   ```

2. **Test with HTML Interface:**
   Open `test_admin_login.html` in browser

3. **Test with cURL:**
   Use the commands above

4. **Integration:**
   Use the admin token in Authorization header for protected routes
