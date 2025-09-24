#!/bin/bash

# =====================================================
# WebRTC Video Consultation - Quick VPS Setup Script
# =====================================================
# यह script आपके Ubuntu VPS पर एक command से सब कुछ setup कर देगा
# 
# Usage: 
#   chmod +x quick-vps-setup.sh
#   ./quick-vps-setup.sh
# =====================================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "${PURPLE}=================================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}=================================================${NC}"
}

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

print_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "यह script root user से न चलाएं। Regular user से चलाएं।"
        echo "अगर आप root हैं तो पहले regular user बनाएं:"
        echo "  adduser yourusername"
        echo "  usermod -aG sudo yourusername"
        echo "  su - yourusername"
        exit 1
    fi
}

# Update system
update_system() {
    print_step "System update कर रहे हैं..."
    sudo apt update && sudo apt upgrade -y
    print_success "System updated successfully"
}

# Install PostgreSQL
install_postgresql() {
    print_step "PostgreSQL install कर रहे हैं..."
    
    if ! command -v psql &> /dev/null; then
        sudo apt install postgresql postgresql-contrib -y
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
        print_success "PostgreSQL installed and started"
    else
        print_info "PostgreSQL already installed"
    fi
}

# Install Node.js
install_nodejs() {
    print_step "Node.js install कर रहे हैं..."
    
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js installed: $(node --version)"
    else
        print_info "Node.js already installed: $(node --version)"
    fi
}

# Install PM2
install_pm2() {
    print_step "PM2 install कर रहे हैं..."
    
    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2
        print_success "PM2 installed"
    else
        print_info "PM2 already installed"
    fi
}

# Setup database
setup_database() {
    print_step "Database setup कर रहे हैं..."
    
    # Get database credentials
    echo -e "${YELLOW}Database credentials enter करें:${NC}"
    read -p "Database name (default: webrtc_consultation): " DB_NAME
    DB_NAME=${DB_NAME:-webrtc_consultation}
    
    read -p "Database user (default: webrtc_user): " DB_USER
    DB_USER=${DB_USER:-webrtc_user}
    
    read -s -p "Database password: " DB_PASSWORD
    echo
    
    if [[ -z "$DB_PASSWORD" ]]; then
        print_error "Password cannot be empty"
        exit 1
    fi
    
    # Create database and user
    print_step "Database और user create कर रहे हैं..."
    
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\q
EOF
    
    print_success "Database created: $DB_NAME"
    print_success "User created: $DB_USER"
}

# Install application dependencies
install_dependencies() {
    print_step "Application dependencies install कर रहे हैं..."
    
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Make sure you're in the backend directory."
        exit 1
    fi
    
    npm install --production
    print_success "Dependencies installed"
}

# Setup environment
setup_environment() {
    print_step "Environment variables setup कर रहे हैं..."
    
    # Create .env file
    cat > .env << EOF
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD

# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Security
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)

# CORS Configuration
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# File Upload Configuration
UPLOAD_DIR=./routes/uploads
MAX_FILE_SIZE=50MB
RECORDINGS_DIR=./recordings

# Logging
LOG_LEVEL=info
LOG_FILE=./server.log

# Admin Configuration
DEFAULT_ADMIN_EMAIL=admin@gmail.com
DEFAULT_ADMIN_PASSWORD=Admin@123
EOF

    print_success "Environment file created"
}

# Setup database tables
setup_tables() {
    print_step "Database tables create कर रहे हैं..."
    
    # Test database connection first
    if node -e "require('./config/database').testConnection()" 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed. Please check credentials."
        exit 1
    fi
    
    # Reset and setup database
    if npm run reset-db; then
        print_success "Database tables created successfully"
    else
        print_error "Failed to create database tables"
        exit 1
    fi
}

# Create directories
create_directories() {
    print_step "Required directories create कर रहे हैं..."
    
    mkdir -p routes/uploads
    mkdir -p recordings
    mkdir -p logs
    
    chmod 755 routes/uploads
    chmod 755 recordings
    chmod 755 logs
    
    print_success "Directories created"
}

# Setup PM2 ecosystem
setup_pm2_ecosystem() {
    print_step "PM2 ecosystem file create कर रहे हैं..."
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'webrtc-consultation',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF
    
    print_success "PM2 ecosystem file created"
}

# Setup firewall
setup_firewall() {
    print_step "Firewall configure कर रहे हैं..."
    
    if command -v ufw &> /dev/null; then
        sudo ufw allow 3000/tcp
        sudo ufw allow ssh
        print_success "Firewall rules added for port 3000"
        print_warning "Don't forget to enable firewall: sudo ufw enable"
    else
        print_warning "UFW not found. Please configure firewall manually."
    fi
}

# Start application
start_application() {
    print_step "Application start कर रहे हैं..."
    
    # Stop if already running
    pm2 delete webrtc-consultation 2>/dev/null || true
    
    # Start with PM2
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    print_success "Application started with PM2"
}

# Verify installation
verify_installation() {
    print_step "Installation verify कर रहे हैं..."
    
    # Check if application is running
    if pm2 list | grep -q "webrtc-consultation"; then
        print_success "Application is running in PM2"
    else
        print_warning "Application might not be running properly"
    fi
    
    # Check database connection
    if node -e "require('./config/database').testConnection()" 2>/dev/null; then
        print_success "Database connection working"
    else
        print_warning "Database connection issues"
    fi
    
    # Test HTTP endpoint
    sleep 3
    if curl -s http://localhost:3000 > /dev/null; then
        print_success "HTTP server responding"
    else
        print_warning "HTTP server might not be responding"
    fi
}

# Print final instructions
print_final_instructions() {
    print_header "🎉 Installation Complete!"
    
    echo -e "${GREEN}आपका WebRTC Video Consultation system successfully deploy हो गया है!${NC}"
    echo
    echo -e "${CYAN}📊 Application Status:${NC}"
    pm2 list
    echo
    echo -e "${CYAN}🔑 Login Credentials:${NC}"
    echo -e "  Admin Panel: ${YELLOW}http://your-server-ip:3000${NC}"
    echo -e "  Admin Email: ${YELLOW}admin@gmail.com${NC}"
    echo -e "  Admin Password: ${YELLOW}Admin@123${NC}"
    echo
    echo -e "  Doctor Email: ${YELLOW}john.smith@hospital.com${NC}"
    echo -e "  Doctor Password: ${YELLOW}password123${NC}"
    echo
    echo -e "${CYAN}📝 Useful Commands:${NC}"
    echo -e "  Check status: ${YELLOW}pm2 status${NC}"
    echo -e "  View logs: ${YELLOW}pm2 logs webrtc-consultation${NC}"
    echo -e "  Restart app: ${YELLOW}pm2 restart webrtc-consultation${NC}"
    echo -e "  Reset database: ${YELLOW}npm run reset-db${NC}"
    echo
    echo -e "${CYAN}🔧 Next Steps:${NC}"
    echo -e "  1. Change default passwords"
    echo -e "  2. Configure your domain name"
    echo -e "  3. Setup SSL certificate for HTTPS"
    echo -e "  4. Configure firewall: ${YELLOW}sudo ufw enable${NC}"
    echo
    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main function
main() {
    print_header "🚀 WebRTC Video Consultation - Quick VPS Setup"
    
    echo -e "${YELLOW}यह script आपके Ubuntu VPS पर complete WebRTC system setup करेगा${NC}"
    echo -e "${YELLOW}Make sure आप backend directory में हैं${NC}"
    echo
    
    read -p "Continue with installation? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Installation cancelled"
        exit 0
    fi
    
    # Check prerequisites
    check_root
    
    # Installation steps
    update_system
    install_postgresql
    install_nodejs
    install_pm2
    setup_database
    install_dependencies
    setup_environment
    create_directories
    setup_tables
    setup_pm2_ecosystem
    setup_firewall
    start_application
    verify_installation
    print_final_instructions
}

# Run main function
main "$@"
