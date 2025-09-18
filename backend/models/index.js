const { sequelize, testConnection } = require('../config/database');
const Doctor = require('./Doctor');
const Patient = require('./Patient');
const Room = require('./Room');
const Consultation = require('./Consultation');

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

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: true });
    console.log('✅ Database synchronized successfully');
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
  syncDatabase
};