const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScreenRecording = sequelize.define('ScreenRecording', {
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
    allowNull: false,
    references: {
      model: 'doctors',
      key: 'id'
    }
  },
  patientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patients',
      key: 'id'
    }
  },
  recordingData: {
    type: DataTypes.TEXT('long'), // For base64 video data or file path
    allowNull: true // Allow null initially, will be updated when recording is saved
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  endedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER, // File size in bytes
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('recording', 'completed', 'failed'),
    allowNull: false,
    defaultValue: 'recording'
  }
}, {
  tableName: 'screen_recordings',
  timestamps: true
});

module.exports = ScreenRecording;