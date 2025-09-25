#!/bin/bash

# =====================================================
# Quick Fix Runner - Run this to fix database issues
# =====================================================

echo "🚨 Running immediate database fix..."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables if .env exists
if [ -f ".env" ]; then
    source .env
    echo -e "${GREEN}✅ Loaded .env file${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found, using defaults${NC}"
fi

# Set default database values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-webrtc_consultation}
DB_USER=${DB_USER:-postgres}

# Ask for password if not set
if [ -z "$DB_PASSWORD" ]; then
    read -s -p "Enter database password: " DB_PASSWORD
    echo
fi

export PGPASSWORD="$DB_PASSWORD"

echo "🔧 Connecting to database: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# Run the fix
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f IMMEDIATE-FIX.sql; then
    echo -e "${GREEN}✅ Database fix completed successfully!${NC}"
    
    echo
    echo -e "${YELLOW}🔄 Restarting application...${NC}"
    
    # Try to restart with PM2 if available
    if command -v pm2 &> /dev/null; then
        pm2 restart webrtc-consultation 2>/dev/null || echo "PM2 app not found, please restart manually"
    else
        echo "PM2 not found. Please restart your application:"
        echo "  npm start"
    fi
    
    echo
    echo -e "${GREEN}🎉 Fix completed! Your recording should work now.${NC}"
    echo
    echo -e "${YELLOW}Test with these credentials:${NC}"
    echo "  Admin: admin@gmail.com / Admin@123"
    echo "  Doctor: santoshkumarsharmabagdatt@gmail.com / password123"
    echo "  Room: 9999"
    
else
    echo -e "${RED}❌ Database fix failed!${NC}"
    echo "Please check:"
    echo "  1. Database connection details"
    echo "  2. PostgreSQL is running"
    echo "  3. User has proper permissions"
    exit 1
fi
