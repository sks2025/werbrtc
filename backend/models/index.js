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

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');
    
    // Create default admin after database sync
    await Admin.createDefaultAdmin();
  } catch (error) {
    console.error('❌ Database synchronization failed:', error.message);
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
  syncDatabase
};