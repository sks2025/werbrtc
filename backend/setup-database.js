#!/usr/bin/env node

/**
 * WebRTC Video Consultation - Database Setup Script
 * This script will reset and recreate all database tables and relations
 * 
 * Usage:
 *   node setup-database.js
 *   npm run setup-db
 *   npm run reset-db
 * 
 * Options:
 *   --force    : Skip confirmation prompt
 *   --seed     : Add sample data after setup
 *   --env      : Specify environment file (default: .env)
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

class DatabaseSetup {
  constructor() {
    this.client = null;
    this.args = process.argv.slice(2);
    this.force = this.args.includes('--force');
    this.seed = this.args.includes('--seed');
    
    // Database configuration
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'webrtc_consultation',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password'
    };
  }

  log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  success(message) {
    this.log(`✅ ${message}`, 'green');
  }

  error(message) {
    this.log(`❌ ${message}`, 'red');
  }

  warning(message) {
    this.log(`⚠️  ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ️  ${message}`, 'blue');
  }

  async connect() {
    try {
      this.client = new Client(this.config);
      await this.client.connect();
      this.success('Connected to PostgreSQL database');
      return true;
    } catch (error) {
      this.error(`Failed to connect to database: ${error.message}`);
      this.info('Please check your database configuration in .env file');
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      this.info('Disconnected from database');
    }
  }

  async promptConfirmation() {
    if (this.force) {
      return true;
    }

    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      this.warning('This will DROP ALL existing tables and data!');
      rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });
  }

  async dropAllTables() {
    this.info('Dropping existing tables...');
    
    const dropQueries = [
      // Drop tables in correct order
      'DROP TABLE IF EXISTS "locations" CASCADE;',
      'DROP TABLE IF EXISTS "call_saves" CASCADE;',
      'DROP TABLE IF EXISTS "room_media" CASCADE;',
      'DROP TABLE IF EXISTS "RoomMedia" CASCADE;',
      'DROP TABLE IF EXISTS "consultations" CASCADE;',
      'DROP TABLE IF EXISTS "Consultations" CASCADE;',
      'DROP TABLE IF EXISTS "rooms" CASCADE;',
      'DROP TABLE IF EXISTS "Rooms" CASCADE;',
      'DROP TABLE IF EXISTS "patients" CASCADE;',
      'DROP TABLE IF EXISTS "Patients" CASCADE;',
      'DROP TABLE IF EXISTS "doctors" CASCADE;',
      'DROP TABLE IF EXISTS "Doctors" CASCADE;',
      'DROP TABLE IF EXISTS "admins" CASCADE;',
      
      // Drop old individual tables
      'DROP TABLE IF EXISTS "CapturedImages" CASCADE;',
      'DROP TABLE IF EXISTS "captured_images" CASCADE;',
      'DROP TABLE IF EXISTS "DigitalSignatures" CASCADE;',
      'DROP TABLE IF EXISTS "digital_signatures" CASCADE;',
      'DROP TABLE IF EXISTS "ScreenRecordings" CASCADE;',
      'DROP TABLE IF EXISTS "screen_recordings" CASCADE;',
      
      // Drop ENUMs
      'DROP TYPE IF EXISTS "enum_Doctors_gender" CASCADE;',
      'DROP TYPE IF EXISTS "enum_Patients_gender" CASCADE;',
      'DROP TYPE IF EXISTS "enum_Rooms_status" CASCADE;',
      'DROP TYPE IF EXISTS "enum_room_media_mediaType" CASCADE;',
      'DROP TYPE IF EXISTS "enum_room_media_signedBy" CASCADE;',
      'DROP TYPE IF EXISTS "enum_room_media_status" CASCADE;',
      'DROP TYPE IF EXISTS "enum_call_saves_status" CASCADE;',
      'DROP TYPE IF EXISTS "enum_locations_status" CASCADE;',
      
      // Drop triggers and functions
      'DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;'
    ];

    for (const query of dropQueries) {
      try {
        await this.client.query(query);
      } catch (error) {
        // Ignore errors for non-existent tables
      }
    }

    this.success('Existing tables dropped');
  }

  async createExtensions() {
    this.info('Creating required extensions...');
    
    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
    ];

    for (const ext of extensions) {
      await this.client.query(ext);
    }

    this.success('Extensions created');
  }

  async createTables() {
    this.info('Creating tables...');

    const createTableQueries = [
      // Doctors table (matching your models)
      `CREATE TABLE "doctors" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "firstName" VARCHAR(255) NOT NULL,
        "lastName" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(20),
        "gender" VARCHAR(10),
        "medicalLicense" VARCHAR(100),
        "specialization" VARCHAR(255),
        "isActive" BOOLEAN DEFAULT true,
        "lastLogin" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Patients table
      `CREATE TABLE "Patients" (
        "patientId" SERIAL PRIMARY KEY,
        "fullName" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "phone" VARCHAR(20) NOT NULL,
        "dateOfBirth" DATE,
        "gender" VARCHAR(10),
        "address" TEXT,
        "emergencyContact" VARCHAR(20),
        "medicalHistory" TEXT,
        "allergies" TEXT,
        "currentMedications" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Rooms table
      `CREATE TABLE "Rooms" (
        "roomId" VARCHAR(255) PRIMARY KEY,
        "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE CASCADE,
        "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE SET NULL,
        "roomName" VARCHAR(255) NOT NULL,
        "status" VARCHAR(50) DEFAULT 'waiting',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "startTime" TIMESTAMP WITH TIME ZONE,
        "endTime" TIMESTAMP WITH TIME ZONE,
        "duration" INTEGER DEFAULT 0,
        "patientLink" TEXT,
        "isActive" BOOLEAN DEFAULT true,
        "maxParticipants" INTEGER DEFAULT 2,
        "recordingEnabled" BOOLEAN DEFAULT false,
        "chatEnabled" BOOLEAN DEFAULT true,
        "whiteboardEnabled" BOOLEAN DEFAULT true,
        "screenShareEnabled" BOOLEAN DEFAULT true
      );`,

      // Consultations table
      `CREATE TABLE "Consultations" (
        "consultationId" SERIAL PRIMARY KEY,
        "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
        "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE CASCADE,
        "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE CASCADE,
        "symptoms" TEXT,
        "diagnosis" TEXT,
        "prescription" TEXT,
        "notes" TEXT,
        "vitalSigns" JSONB,
        "capturedImages" JSONB,
        "patientSignature" TEXT,
        "doctorSignature" TEXT,
        "followUpDate" DATE,
        "followUpInstructions" TEXT,
        "consultationDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "status" VARCHAR(50) DEFAULT 'in_progress',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // RoomMedia table
      `CREATE TABLE "RoomMedia" (
        "id" SERIAL PRIMARY KEY,
        "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
        "mediaType" VARCHAR(50) NOT NULL CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
        "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE SET NULL,
        "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE SET NULL,
        "mediaData" TEXT NOT NULL,
        "fileName" VARCHAR(255),
        "metadata" JSONB DEFAULT '{}',
        "duration" INTEGER,
        "fileSize" INTEGER,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "signedBy" VARCHAR(10) CHECK ("signedBy" IN ('doctor', 'patient')),
        "purpose" VARCHAR(255),
        "description" TEXT,
        "status" VARCHAR(20) DEFAULT 'completed' CHECK ("status" IN ('recording', 'completed', 'failed', 'processing')),
        "capturedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "isLiveStreaming" BOOLEAN DEFAULT false,
        "liveChunks" JSONB DEFAULT '[]',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Admins table
      `CREATE TABLE "admins" (
        "id" SERIAL PRIMARY KEY,
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "name" VARCHAR(255) NOT NULL DEFAULT 'System Admin',
        "role" VARCHAR(50) NOT NULL DEFAULT 'admin',
        "isActive" BOOLEAN DEFAULT true,
        "lastLogin" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Call saves table
      `CREATE TABLE "call_saves" (
        "id" SERIAL PRIMARY KEY,
        "roomId" VARCHAR(255) NOT NULL,
        "recordingData" VARCHAR(255),
        "fileName" VARCHAR(255),
        "duration" INTEGER,
        "fileSize" INTEGER,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "endedAt" TIMESTAMP WITH TIME ZONE,
        "status" VARCHAR(20) DEFAULT 'recording' CHECK ("status" IN ('recording', 'completed', 'failed')),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Locations table
      `CREATE TABLE "locations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roomId" VARCHAR(255) NOT NULL REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
        "patientLatitude" DECIMAL(10,8),
        "patientLongitude" DECIMAL(11,8),
        "patientAddress" TEXT,
        "patientLocationTimestamp" TIMESTAMP WITH TIME ZONE,
        "patientLocationAccuracy" FLOAT,
        "doctorLatitude" DECIMAL(10,8),
        "doctorLongitude" DECIMAL(11,8),
        "doctorAddress" TEXT,
        "doctorLocationTimestamp" TIMESTAMP WITH TIME ZONE,
        "doctorLocationAccuracy" FLOAT,
        "metadata" JSONB DEFAULT '{}',
        "status" VARCHAR(50) DEFAULT 'active',
        "distanceKm" FLOAT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const query of createTableQueries) {
      await this.client.query(query);
    }

    this.success('Tables created');
  }

  async createIndexes() {
    this.info('Creating indexes...');

    const indexQueries = [
      // Core table indexes
      'CREATE INDEX "idx_doctors_email" ON "Doctors"("email");',
      'CREATE INDEX "idx_doctors_active" ON "Doctors"("isActive");',
      'CREATE INDEX "idx_patients_phone" ON "Patients"("phone");',
      'CREATE INDEX "idx_patients_email" ON "Patients"("email");',
      'CREATE INDEX "idx_rooms_doctor" ON "Rooms"("doctorId");',
      'CREATE INDEX "idx_rooms_patient" ON "Rooms"("patientId");',
      'CREATE INDEX "idx_rooms_status" ON "Rooms"("status");',
      'CREATE INDEX "idx_rooms_active" ON "Rooms"("isActive");',
      'CREATE INDEX "idx_consultations_room" ON "Consultations"("roomId");',
      'CREATE INDEX "idx_consultations_doctor" ON "Consultations"("doctorId");',
      'CREATE INDEX "idx_consultations_patient" ON "Consultations"("patientId");',
      'CREATE INDEX "idx_consultations_status" ON "Consultations"("status");',
      'CREATE INDEX "idx_consultations_date" ON "Consultations"("consultationDate");',

      // RoomMedia indexes
      'CREATE INDEX "idx_roommedia_room_type" ON "RoomMedia"("roomId", "mediaType");',
      'CREATE INDEX "idx_roommedia_captured_at" ON "RoomMedia"("capturedAt");',
      'CREATE INDEX "idx_roommedia_status" ON "RoomMedia"("status");',
      'CREATE INDEX "idx_roommedia_doctor" ON "RoomMedia"("doctorId");',
      'CREATE INDEX "idx_roommedia_patient" ON "RoomMedia"("patientId");',
      'CREATE INDEX "idx_roommedia_live_streaming" ON "RoomMedia"("isLiveStreaming") WHERE "isLiveStreaming" = true;',

      // Admin indexes
      'CREATE INDEX "idx_admins_email" ON "admins"("email");',
      'CREATE INDEX "idx_admins_active" ON "admins"("isActive");',
      'CREATE INDEX "idx_admins_role" ON "admins"("role");',

      // Call saves indexes
      'CREATE INDEX "idx_call_saves_room" ON "call_saves"("roomId");',
      'CREATE INDEX "idx_call_saves_status" ON "call_saves"("status");',
      'CREATE INDEX "idx_call_saves_created" ON "call_saves"("createdAt");',

      // Location indexes
      'CREATE INDEX "idx_locations_roomId" ON "locations"("roomId");',
      'CREATE INDEX "idx_locations_patient_coords" ON "locations"("patientLatitude", "patientLongitude");',
      'CREATE INDEX "idx_locations_doctor_coords" ON "locations"("doctorLatitude", "doctorLongitude");',
      'CREATE INDEX "idx_locations_createdAt" ON "locations"("createdAt");',
      'CREATE INDEX "idx_locations_status" ON "locations"("status");'
    ];

    for (const query of indexQueries) {
      await this.client.query(query);
    }

    this.success('Indexes created');
  }

  async createTriggers() {
    this.info('Creating triggers...');

    // Create trigger function
    await this.client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW."updatedAt" = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const triggerQueries = [
      'CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON "Doctors" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON "Patients" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON "Rooms" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON "Consultations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_roommedia_updated_at BEFORE UPDATE ON "RoomMedia" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON "admins" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_call_saves_updated_at BEFORE UPDATE ON "call_saves" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON "locations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
    ];

    for (const query of triggerQueries) {
      await this.client.query(query);
    }

    this.success('Triggers created');
  }

  async insertSampleData() {
    this.info('Inserting sample data...');

    const insertQueries = [
      // Default admin (password: Admin@123)
      `INSERT INTO "admins" ("email", "password", "name", "role") 
       VALUES ('admin@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');`,

      // Sample doctors (password: password123)
      `INSERT INTO "Doctors" ("fullName", "email", "password", "specialization", "licenseNumber", "phone") 
       VALUES 
         ('Dr. John Smith', 'john.smith@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'General Medicine', 'MD12345', '+1234567890'),
         ('Dr. Sarah Johnson', 'sarah.johnson@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Cardiology', 'MD12346', '+1234567891'),
         ('Dr. Michael Brown', 'michael.brown@hospital.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Pediatrics', 'MD12347', '+1234567892');`,

      // Sample patient
      `INSERT INTO "Patients" ("fullName", "email", "phone", "dateOfBirth", "gender", "address") 
       VALUES ('John Doe', 'john.doe@example.com', '+1234567893', '1985-06-15', 'Male', '123 Main St, City, State');`
    ];

    for (const query of insertQueries) {
      await this.client.query(query);
    }

    this.success('Sample data inserted');
  }

  async verifySetup() {
    this.info('Verifying database setup...');

    // Check tables
    const tablesResult = await this.client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    this.success(`Created ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach(row => {
      this.log(`  - ${row.tablename}`, 'cyan');
    });

    // Check record counts
    const tables = ['Doctors', 'Patients', 'Rooms', 'admins', 'Consultations', 'RoomMedia', 'call_saves', 'locations'];
    
    this.info('Record counts:');
    for (const table of tables) {
      try {
        const countResult = await this.client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        this.log(`  - ${table}: ${countResult.rows[0].count} records`, 'cyan');
      } catch (error) {
        this.warning(`  - ${table}: Error counting records`);
      }
    }
  }

  async run() {
    console.log('\n================================================');
    this.log('🚀 WebRTC Database Setup Script', 'magenta');
    console.log('================================================\n');

    try {
      // Connect to database
      const connected = await this.connect();
      if (!connected) {
        process.exit(1);
      }

      // Get confirmation
      const confirmed = await this.promptConfirmation();
      if (!confirmed) {
        this.warning('Database setup cancelled');
        await this.disconnect();
        process.exit(0);
      }

      // Start setup process
      await this.dropAllTables();
      await this.createExtensions();
      await this.createTables();
      await this.createIndexes();
      await this.createTriggers();
      
      if (this.seed) {
        await this.insertSampleData();
      }

      await this.verifySetup();

      console.log('\n================================================');
      this.success('🎉 Database setup completed successfully!');
      console.log('================================================');
      
      if (this.seed) {
        this.log('\n🔑 Login Credentials:', 'yellow');
        this.log('  Admin: admin@gmail.com / Admin@123', 'cyan');
        this.log('  Doctor: john.smith@hospital.com / password123', 'cyan');
      }

      console.log('\n📋 Next Steps:');
      this.log('  1. Start your application: npm start', 'cyan');
      this.log('  2. Access admin panel: http://localhost:3000', 'cyan');
      if (!this.seed) {
        this.log('  3. Run with --seed flag to add sample data', 'cyan');
      }

    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    } finally {
      await this.disconnect();
    }
  }
}

// Handle script execution
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.run().catch(console.error);
}

module.exports = DatabaseSetup;
