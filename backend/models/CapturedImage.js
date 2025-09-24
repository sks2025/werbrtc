const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CapturedImage = sequelize.define('CapturedImage', {
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
  imageData: {
    type: DataTypes.TEXT('long'), // For base64 image data
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  capturedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  capturedBy: {
    type: DataTypes.ENUM('doctor', 'patient'),
    allowNull: false,
    defaultValue: 'doctor'
  }
}, {
  tableName: 'captured_images',
  timestamps: true
});

module.exports = CapturedImage;