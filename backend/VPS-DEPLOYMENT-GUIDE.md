# VPS Deployment Guide - WebRTC Video Consultation

इस guide में आपको अपने Ubuntu VPS पर WebRTC Video Consultation system को deploy करने के लिए सभी steps मिल जाएंगे।

## 🚀 Quick Setup (One Command)

### Option 1: Using Deployment Script (Recommended)
```bash
# Clone your repository
git clone <your-repo-url>
cd werbrtc/backend

# Run deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Option 2: Using NPM Scripts
```bash
# After cloning and installing dependencies
npm run deploy
```

## 📋 Manual Step-by-Step Setup

### 1. Prerequisites (Ubuntu VPS)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Node.js (18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (for process management)
sudo npm install -g pm2
```

### 2. PostgreSQL Setup
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE webrtc_consultation;
CREATE USER your_username WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE webrtc_consultation TO your_username;
\q
```

### 3. Application Setup
```bash
# Clone repository
git clone <your-repo-url>
cd werbrtc/backend

# Install dependencies
npm install --production

# Copy environment template
cp env-template-vps.txt .env

# Edit .env file with your settings
nano .env
```

### 4. Database Setup (Choose One Method)

#### Method A: Using Node.js Script (Recommended)
```bash
# Reset database and create all tables with sample data
npm run reset-db

# Or setup without sample data
npm run db-no-seed

# Test database connection
npm run test-db
```

#### Method B: Using SQL Script
```bash
# Using PostgreSQL command line
psql -U your_username -d webrtc_consultation -f reset-and-setup-database.sql
```

### 5. Start Application
```bash
# Start with PM2 (recommended for production)
pm2 start ecosystem.config.js

# Or start directly
npm start
```

## 🔧 Available NPM Scripts

```bash
# Database Management
npm run setup-db      # Setup database with sample data
npm run reset-db      # Reset database completely (with sample data)
npm run db-no-seed    # Reset database without sample data
npm run test-db       # Test database connection

# Application Management
npm start             # Start application
npm run dev           # Start in development mode
npm run deploy        # Run full deployment script
```

## 🗃️ Database Tables Created

The scripts will create the following tables:
- **Doctors** - Doctor profiles and authentication
- **Patients** - Patient information
- **Rooms** - Video call rooms
- **Consultations** - Consultation records
- **RoomMedia** - Media files (recordings, signatures, images)
- **admins** - Admin users
- **call_saves** - Recording management
- **locations** - GPS tracking data

## 🔑 Default Login Credentials

After running the setup script, you can use these credentials:

### Admin Panel
- **Email:** admin@gmail.com
- **Password:** Admin@123

### Doctor Login
- **Email:** john.smith@hospital.com
- **Password:** password123

## 🌐 Environment Configuration

Make sure to update these variables in your `.env` file:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webrtc_consultation
DB_USER=your_username
DB_PASSWORD=your_secure_password

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars
SESSION_SECRET=your_session_secret_here_min_32_chars

# Frontend URL (update with your domain)
FRONTEND_URL=https://your-domain.com
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

## 🔥 Firewall Configuration

```bash
# Allow application port
sudo ufw allow 3000

# For HTTPS (if using SSL)
sudo ufw allow 443

# Enable firewall
sudo ufw enable
```

## 🔄 Database Reset Commands

### If you need to reset database anytime:

```bash
# Complete reset with fresh tables and sample data
npm run reset-db

# Reset without sample data
npm run db-no-seed

# Manual SQL reset
psql -U your_username -d webrtc_consultation -f reset-and-setup-database.sql
```

## 📊 Verification Commands

```bash
# Check if all tables are created
psql -U your_username -d webrtc_consultation -c "\dt"

# Check sample data
psql -U your_username -d webrtc_consultation -c "SELECT COUNT(*) FROM \"Doctors\";"

# Test application
curl http://localhost:3000

# Check PM2 status
pm2 status

# View application logs
pm2 logs webrtc-consultation
```

## 🔧 Troubleshooting

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -U your_username -d webrtc_consultation -c "SELECT version();"

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Application Issues
```bash
# Check application logs
pm2 logs webrtc-consultation

# Restart application
pm2 restart webrtc-consultation

# Check process status
pm2 status
```

### Permission Issues
```bash
# Fix file permissions
chmod +x deploy-vps.sh
chmod -R 755 routes/uploads
chmod -R 755 recordings
```

## 🎯 Next Steps After Deployment

1. **Change Default Passwords** - Update admin and doctor passwords
2. **Setup SSL Certificate** - Configure HTTPS for production
3. **Configure Domain** - Point your domain to the VPS
4. **Setup Reverse Proxy** - Configure Nginx/Apache if needed
5. **Database Backups** - Setup automated database backups
6. **Monitoring** - Setup application monitoring

## 🆘 Support

If you encounter any issues:
1. Check the logs: `pm2 logs webrtc-consultation`
2. Verify database connection: `npm run test-db`
3. Check all services are running: `pm2 status`
4. Review the .env file configuration

---

**Happy Deployment! 🚀**
