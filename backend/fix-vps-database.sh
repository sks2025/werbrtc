#!/bin/bash

# =====================================================
# VPS Database Fix Script
# This will fix the "mediaData column does not exist" error
# =====================================================

echo "🔧 Fixing VPS Database Schema..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists
if [[ ! -f ".env" ]]; then
    print_error ".env file not found!"
    echo "Please make sure you're in the backend directory and .env file exists"
    exit 1
fi

# Load environment variables
source .env

# Method 1: Try Node.js reset script (recommended)
print_step "Trying Node.js database reset..."
if node setup-database.js --force --seed; then
    print_success "Database reset completed successfully!"
    
    # Test the fix
    print_step "Testing database connection..."
    if node -e "require('./config/database').testConnection()"; then
        print_success "Database connection working!"
        
        # Start/restart the application
        print_step "Restarting application..."
        if command -v pm2 &> /dev/null; then
            pm2 restart webrtc-consultation || pm2 start ecosystem.config.js
            print_success "Application restarted with PM2"
        else
            print_warning "PM2 not found. Please restart your application manually:"
            echo "  npm start"
        fi
        
        echo
        print_success "🎉 Database fix completed!"
        echo -e "${GREEN}Your recording functionality should work now.${NC}"
        echo
        echo -e "${YELLOW}Login credentials:${NC}"
        echo -e "  Admin: admin@gmail.com / Admin@123"
        echo -e "  Doctor: john.smith@hospital.com / password123"
        
    else
        print_error "Database connection test failed"
        exit 1
    fi
    
else
    # Method 2: Try SQL script
    print_warning "Node.js method failed, trying SQL method..."
    
    if [[ -f "reset-and-setup-database.sql" ]]; then
        print_step "Running SQL reset script..."
        
        if [[ -z "$DB_PASSWORD" ]]; then
            read -s -p "Enter database password: " DB_PASSWORD
            echo
        fi
        
        export PGPASSWORD="$DB_PASSWORD"
        
        if echo "yes" | psql -h ${DB_HOST:-localhost} -U ${DB_USER:-postgres} -d ${DB_NAME:-webrtc_consultation} -f reset-and-setup-database.sql; then
            print_success "SQL reset completed successfully!"
            
            # Restart application
            if command -v pm2 &> /dev/null; then
                pm2 restart webrtc-consultation || pm2 start ecosystem.config.js
                print_success "Application restarted"
            fi
            
            print_success "🎉 Database fix completed!"
            
        else
            print_error "SQL reset failed"
            exit 1
        fi
    else
        print_error "No reset script found!"
        exit 1
    fi
fi

echo
echo -e "${BLUE}To verify the fix:${NC}"
echo -e "  1. Access your application: http://your-server:3000"
echo -e "  2. Login as doctor and try recording"
echo -e "  3. Check logs: pm2 logs webrtc-consultation"
