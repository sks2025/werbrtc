#!/bin/bash

# WebRTC Video Consultation - VPS Deployment Script
# This script sets up the database and environment on your VPS

echo "🚀 Starting WebRTC Video Consultation VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if PostgreSQL is installed
check_postgresql() {
    print_status "Checking PostgreSQL installation..."
    if ! command -v psql &> /dev/null; then
        print_error "PostgreSQL is not installed. Please install PostgreSQL first."
        echo "On Ubuntu/Debian: sudo apt update && sudo apt install postgresql postgresql-contrib"
        echo "On CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
        exit 1
    fi
    print_success "PostgreSQL is installed"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        echo "Visit: https://nodejs.org/ or use a package manager"
        exit 1
    fi
    print_success "Node.js is installed ($(node --version))"
}

# Create database if it doesn't exist
create_database() {
    print_status "Creating database..."
    
    read -p "Enter PostgreSQL username (default: postgres): " DB_USER
    DB_USER=${DB_USER:-postgres}
    
    read -s -p "Enter PostgreSQL password: " DB_PASSWORD
    echo
    
    read -p "Enter database name (default: webrtc_consultation): " DB_NAME
    DB_NAME=${DB_NAME:-webrtc_consultation}
    
    # Test connection
    export PGPASSWORD=$DB_PASSWORD
    if psql -h localhost -U $DB_USER -d postgres -c "\q" 2>/dev/null; then
        print_success "Database connection successful"
    else
        print_error "Failed to connect to PostgreSQL. Please check credentials."
        exit 1
    fi
    
    # Create database if it doesn't exist
    psql -h localhost -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || print_warning "Database may already exist"
    print_success "Database $DB_NAME is ready"
}

# Run database setup script
setup_database() {
    print_status "Setting up database tables..."
    
    if [ ! -f "vps-database-setup.sql" ]; then
        print_error "Database setup script not found: vps-database-setup.sql"
        exit 1
    fi
    
    export PGPASSWORD=$DB_PASSWORD
    if psql -h localhost -U $DB_USER -d $DB_NAME -f vps-database-setup.sql; then
        print_success "Database tables created successfully"
    else
        print_error "Failed to create database tables"
        exit 1
    fi
}

# Setup environment variables
setup_environment() {
    print_status "Setting up environment variables..."
    
    if [ ! -f ".env" ]; then
        if [ -f "env-template-vps.txt" ]; then
            cp env-template-vps.txt .env
            print_success "Environment template copied to .env"
        else
            print_error "Environment template not found: env-template-vps.txt"
            exit 1
        fi
    else
        print_warning ".env file already exists, skipping..."
    fi
    
    # Update database credentials in .env
    sed -i "s/DB_USER=.*/DB_USER=$DB_USER/" .env
    sed -i "s/DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/DB_NAME=.*/DB_NAME=$DB_NAME/" .env
    
    print_success "Environment variables configured"
    print_warning "Please review and update .env file with your specific settings"
}

# Install dependencies
install_dependencies() {
    print_status "Installing Node.js dependencies..."
    
    if [ -f "package.json" ]; then
        npm install --production
        print_success "Dependencies installed"
    else
        print_error "package.json not found"
        exit 1
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p routes/uploads
    mkdir -p recordings
    mkdir -p logs
    
    # Set permissions
    chmod 755 routes/uploads
    chmod 755 recordings
    chmod 755 logs
    
    print_success "Directories created"
}

# Setup PM2 (if available)
setup_pm2() {
    print_status "Checking PM2 for process management..."
    
    if command -v pm2 &> /dev/null; then
        print_status "PM2 found, creating ecosystem file..."
        
        cat > ecosystem.config.js << EOF
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
    }
  }]
}
EOF
        print_success "PM2 ecosystem file created"
        print_status "To start the application: pm2 start ecosystem.config.js"
    else
        print_warning "PM2 not found. Consider installing PM2 for process management:"
        print_warning "npm install -g pm2"
    fi
}

# Setup firewall rules (if needed)
setup_firewall() {
    print_status "Checking firewall configuration..."
    
    if command -v ufw &> /dev/null; then
        print_warning "UFW detected. Make sure to allow the application port:"
        print_warning "sudo ufw allow 3000"
    elif command -v firewall-cmd &> /dev/null; then
        print_warning "FirewallD detected. Make sure to allow the application port:"
        print_warning "sudo firewall-cmd --permanent --add-port=3000/tcp"
        print_warning "sudo firewall-cmd --reload"
    fi
}

# Main deployment process
main() {
    echo "================================================"
    echo "  WebRTC Video Consultation VPS Deployment"
    echo "================================================"
    echo
    
    # Pre-flight checks
    check_postgresql
    check_nodejs
    
    echo
    print_status "Starting deployment process..."
    echo
    
    # Database setup
    create_database
    setup_database
    
    # Application setup
    setup_environment
    install_dependencies
    create_directories
    setup_pm2
    setup_firewall
    
    echo
    print_success "🎉 Deployment completed successfully!"
    echo
    echo "================================================"
    echo "  Next Steps:"
    echo "================================================"
    echo "1. Review and update .env file with your settings"
    echo "2. Configure SSL certificates for HTTPS"
    echo "3. Start the application:"
    echo "   - With PM2: pm2 start ecosystem.config.js"
    echo "   - Direct: npm start"
    echo "4. Access admin panel: http://your-server:3000"
    echo "   - Login: admin@gmail.com / Admin@123"
    echo "5. Configure reverse proxy (nginx/apache) if needed"
    echo "================================================"
    echo
    print_warning "Don't forget to:"
    print_warning "- Change default passwords"
    print_warning "- Setup SSL certificates"
    print_warning "- Configure firewall rules"
    print_warning "- Setup regular database backups"
}

# Run main function
main "$@"
