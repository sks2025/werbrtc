const { sequelize, testConnection } = require('../config/database');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Room = require('./Room');
const Consultation = require('./Consultation');
const CapturedImage = require('./CapturedImage');
const DigitalSignature = require('./DigitalSignature');
const ScreenRecording = require('./ScreenRecording');
const RoomMedia = require('./RoomMedia');
const Admin = require('./Admin');
const Location = require('./Location');

// Define associations
Doctor.hasMany(Room, { foreignKey: 'doctorId', as: 'rooms' });
Room.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Room, { foreignKey: 'patientId', as: 'rooms' });
Room.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Doctor.hasMany(Consultation, { foreignKey: 'doctorId', as: 'consultations' });
Consultation.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(Consultation, { foreignKey: 'patientId', as: 'consultations' });
Consultation.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Room.hasMany(Consultation, { foreignKey: 'roomId', as: 'consultations' });
Consultation.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// CapturedImage associations
Room.hasMany(CapturedImage, { foreignKey: 'roomId', as: 'capturedImages' });
CapturedImage.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Doctor.hasMany(CapturedImage, { foreignKey: 'doctorId', as: 'capturedImages' });
CapturedImage.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(CapturedImage, { foreignKey: 'patientId', as: 'capturedImages' });
CapturedImage.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// DigitalSignature associations
Room.hasMany(DigitalSignature, { foreignKey: 'roomId', as: 'signatures' });
DigitalSignature.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Doctor.hasMany(DigitalSignature, { foreignKey: 'doctorId', as: 'signatures' });
DigitalSignature.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(DigitalSignature, { foreignKey: 'patientId', as: 'signatures' });
DigitalSignature.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// ScreenRecording associations
Room.hasMany(ScreenRecording, { foreignKey: 'roomId', as: 'recordings' });
ScreenRecording.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Doctor.hasMany(ScreenRecording, { foreignKey: 'doctorId', as: 'recordings' });
ScreenRecording.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(ScreenRecording, { foreignKey: 'patientId', as: 'recordings' });
ScreenRecording.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// RoomMedia associations (Unified media table)
Room.hasMany(RoomMedia, { foreignKey: 'roomId', as: 'media' });
RoomMedia.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

Doctor.hasMany(RoomMedia, { foreignKey: 'doctorId', as: 'media' });
RoomMedia.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' });

Patient.hasMany(RoomMedia, { foreignKey: 'patientId', as: 'media' });
RoomMedia.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// Location associations
Room.hasMany(Location, { foreignKey: 'roomId', as: 'locations' });
Location.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

// Sync database
const syncDatabase = async () => {
  try {
    // First, sync core models without alter
    await sequelize.sync({ force: false });
    console.log('✅ Database synchronized successfully');
    
    // Create default admin after database sync
    try {
      await Admin.createDefaultAdmin();
    } catch (adminError) {
      console.log('Admin creation skipped:', adminError.message);
    }
  } catch (error) {
    console.error('❌ Database synchronization failed:', error.message);
    
    // Try to create individual tables if sync fails
    try {
      console.log('🔄 Attempting individual table creation...');
      
      // Create Location table manually if it doesn't exist
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "locations" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "roomId" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
          "patientLatitude" DECIMAL(10,8),
          "patientLongitude" DECIMAL(11,8),
          "patientAddress" TEXT,
          "patientLocationTimestamp" TIMESTAMP,
          "patientLocationAccuracy" FLOAT,
          "doctorLatitude" DECIMAL(10,8),
          "doctorLongitude" DECIMAL(11,8),
          "doctorAddress" TEXT,
          "doctorLocationTimestamp" TIMESTAMP,
          "doctorLocationAccuracy" FLOAT,
          "metadata" JSONB DEFAULT '{}',
          "status" VARCHAR(50) DEFAULT 'active',
          "distanceKm" FLOAT,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create indexes
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS "locations_roomId_idx" ON "locations"("roomId");
        CREATE INDEX IF NOT EXISTS "locations_patient_coords_idx" ON "locations"("patientLatitude", "patientLongitude");
        CREATE INDEX IF NOT EXISTS "locations_doctor_coords_idx" ON "locations"("doctorLatitude", "doctorLongitude");
      `);
      
      console.log('✅ Location table created manually');
    } catch (manualError) {
      console.error('❌ Manual table creation failed:', manualError.message);
    }
  }
};

module.exports = {
  sequelize,
  testConnection,
  Doctor,
  Patient,
  Room,
  Consultation,
  CapturedImage,
  DigitalSignature,
  ScreenRecording,
  RoomMedia,
  Admin,
  Location,
  syncDatabase
};