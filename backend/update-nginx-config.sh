#!/bin/bash

# =====================================================
# Nginx Configuration Update Script for Large File Uploads
# यह script VPS पर nginx configuration को update करेगा
# =====================================================

set -e

echo "🔧 Updating Nginx Configuration for Large File Uploads"
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
    exit 1
fi

# Backup current nginx config
echo -e "${BLUE}📦 Creating backup of current nginx configuration...${NC}"
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

# Create new nginx configuration
echo -e "${BLUE}📝 Creating new nginx configuration...${NC}"

cat > /etc/nginx/sites-available/default << 'EOF'
# Nginx Configuration for WebRTC Video Consultation API
# Optimized for large file uploads

server {
    listen 80;
    server_name api.stechooze.com;
    
    # Increase client body size limit for large recordings
    client_max_body_size 500M;
    
    # Increase buffer sizes
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Increase timeout settings
    client_body_timeout 300s;
    client_header_timeout 60s;
    send_timeout 60s;
    
    # Main proxy location
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Increase proxy buffer sizes
        proxy_buffer_size 4k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }
    
    # Specific location for media uploads with higher limits
    location /api/media/ {
        client_max_body_size 500M;
        client_body_timeout 300s;
        client_header_timeout 60s;
        
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Extended timeouts for large uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        # Larger buffers for media uploads
        proxy_buffer_size 8k;
        proxy_buffers 8 64k;
        proxy_busy_buffers_size 128k;
    }
    
    # Static files location
    location /uploads/ {
        alias /var/www/webrtc/backend/routes/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

# HTTPS configuration (if SSL is configured)
server {
    listen 443 ssl http2;
    server_name api.stechooze.com;
    
    # SSL configuration (update paths as needed)
    # ssl_certificate /path/to/your/certificate.crt;
    # ssl_certificate_key /path/to/your/private.key;
    
    # Same settings as HTTP
    client_max_body_size 500M;
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    client_body_timeout 300s;
    client_header_timeout 60s;
    send_timeout 60s;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_buffer_size 4k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }
    
    location /api/media/ {
        client_max_body_size 500M;
        client_body_timeout 300s;
        client_header_timeout 60s;
        
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffer_size 8k;
        proxy_buffers 8 64k;
        proxy_busy_buffers_size 128k;
    }
    
    location /uploads/ {
        alias /var/www/webrtc/backend/routes/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

echo -e "${GREEN}✅ New nginx configuration created${NC}"

# Test nginx configuration
echo -e "${BLUE}🔍 Testing nginx configuration...${NC}"
if nginx -t; then
    echo -e "${GREEN}✅ Nginx configuration test passed${NC}"
else
    echo -e "${RED}❌ Nginx configuration test failed${NC}"
    echo -e "${YELLOW}⚠️  Restoring backup configuration...${NC}"
    cp /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S) /etc/nginx/sites-available/default
    exit 1
fi

# Reload nginx
echo -e "${BLUE}🔄 Reloading nginx...${NC}"
systemctl reload nginx

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Nginx reloaded successfully${NC}"
else
    echo -e "${RED}❌ Failed to reload nginx${NC}"
    exit 1
fi

# Check nginx status
echo -e "${BLUE}📊 Checking nginx status...${NC}"
systemctl status nginx --no-pager -l

echo ""
echo -e "${GREEN}🎉 Nginx Configuration Updated Successfully!${NC}"
echo "====================================================="
echo -e "${BLUE}📋 Updated Settings:${NC}"
echo "  ✅ client_max_body_size: 500M"
echo "  ✅ client_body_timeout: 300s"
echo "  ✅ proxy timeouts: 300s"
echo "  ✅ Large buffer sizes for media uploads"
echo ""
echo -e "${BLUE}🔧 What was changed:${NC}"
echo "  • Increased file upload limit to 500MB"
echo "  • Extended timeouts for large uploads"
echo "  • Optimized buffer sizes for media files"
echo "  • Added specific configuration for /api/media/ endpoint"
echo ""
echo -e "${GREEN}🚀 Your API can now handle large recording files!${NC}"
echo "====================================================="
