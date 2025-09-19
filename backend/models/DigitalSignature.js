const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DigitalSignature = sequelize.define('DigitalSignature', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'rooms',
      key: 'id'
    }
  },
  signedBy: {
    type: DataTypes.ENUM('doctor', 'patient'),
    allowNull: false
  },
  doctorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'doctors',
      key: 'id'
    }
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  signatureData: {
    type: DataTypes.TEXT('long'), // For base64 signature data
    allowNull: false
  },
  signedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  purpose: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'consultation_agreement'
  }
}, {
  tableName: 'digital_signatures',
  timestamps: true
});

module.exports = DigitalSignature;