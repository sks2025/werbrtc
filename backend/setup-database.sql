-- WebRTC Video Consultation Database Setup
-- Run this script in PostgreSQL to create the database and tables

-- Create database (run this as postgres superuser)
-- CREATE DATABASE webrtc_consultation;

-- Connect to the database and create tables
-- \c webrtc_consultation;

-- Create Doctors table
CREATE TABLE IF NOT EXISTS "Doctors" (
    "doctorId" SERIAL PRIMARY KEY,
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "specialization" VARCHAR(255),
    "licenseNumber" VARCHAR(100),
    "phone" VARCHAR(20),
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Patients table
CREATE TABLE IF NOT EXISTS "Patients" (
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
);

-- Create Rooms table
CREATE TABLE IF NOT EXISTS "Rooms" (
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
);

-- Create Consultations table
CREATE TABLE IF NOT EXISTS "Consultations" (
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
);

-- Create Unified Room Media table (NEW - stores all media types in one table)
CREATE TABLE IF NOT EXISTS "RoomMedia" (
    "id" SERIAL PRIMARY KEY,
    "roomId" VARCHAR(255) REFERENCES "Rooms"("roomId") ON DELETE CASCADE,
    "mediaType" VARCHAR(50) NOT NULL CHECK ("mediaType" IN ('screen_recording', 'digital_signature', 'captured_image')),
    "doctorId" INTEGER REFERENCES "Doctors"("doctorId") ON DELETE SET NULL,
    "patientId" INTEGER REFERENCES "Patients"("patientId") ON DELETE SET NULL,
    "mediaData" TEXT NOT NULL, -- Base64 data or file path
    "fileName" VARCHAR(255),
    "metadata" JSONB DEFAULT '{}', -- Additional metadata as JSON
    
    -- Screen recording specific fields
    "duration" INTEGER, -- Duration in seconds
    "fileSize" INTEGER, -- File size in bytes
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "endedAt" TIMESTAMP WITH TIME ZONE,
    
    -- Signature specific fields
    "signedBy" VARCHAR(10) CHECK ("signedBy" IN ('doctor', 'patient')),
    "purpose" VARCHAR(255),
    
    -- Image specific fields
    "description" TEXT,
    
    -- Common fields
    "status" VARCHAR(20) DEFAULT 'completed' CHECK ("status" IN ('recording', 'completed', 'failed', 'processing')),
    "capturedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Live streaming support
    "isLiveStreaming" BOOLEAN DEFAULT false,
    "liveChunks" JSONB DEFAULT '[]', -- Store live chunk information
    
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_doctors_email" ON "Doctors"("email");
CREATE INDEX IF NOT EXISTS "idx_patients_phone" ON "Patients"("phone");
CREATE INDEX IF NOT EXISTS "idx_rooms_doctor" ON "Rooms"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_rooms_status" ON "Rooms"("status");
CREATE INDEX IF NOT EXISTS "idx_consultations_room" ON "Consultations"("roomId");
CREATE INDEX IF NOT EXISTS "idx_consultations_doctor" ON "Consultations"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_consultations_patient" ON "Consultations"("patientId");

-- Indexes for RoomMedia table
CREATE INDEX IF NOT EXISTS "idx_roommedia_room_type" ON "RoomMedia"("roomId", "mediaType");
CREATE INDEX IF NOT EXISTS "idx_roommedia_captured_at" ON "RoomMedia"("capturedAt");
CREATE INDEX IF NOT EXISTS "idx_roommedia_status" ON "RoomMedia"("status");
CREATE INDEX IF NOT EXISTS "idx_roommedia_doctor" ON "RoomMedia"("doctorId");
CREATE INDEX IF NOT EXISTS "idx_roommedia_patient" ON "RoomMedia"("patientId");
CREATE INDEX IF NOT EXISTS "idx_roommedia_live_streaming" ON "RoomMedia"("isLiveStreaming") WHERE "isLiveStreaming" = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON "Doctors" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON "Patients" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON "Rooms" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON "Consultations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roommedia_updated_at BEFORE UPDATE ON "RoomMedia" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO "Doctors" ("fullName", "email", "password", "specialization", "licenseNumber", "phone") 
VALUES 
    ('Dr. John Smith', 'john.smith@hospital.com', '$2b$10$example_hashed_password', 'General Medicine', 'MD12345', '+1234567890'),
    ('Dr. Sarah Johnson', 'sarah.johnson@hospital.com', '$2b$10$example_hashed_password', 'Cardiology', 'MD12346', '+1234567891')
ON CONFLICT ("email") DO NOTHING;

COMMIT;