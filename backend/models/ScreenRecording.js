const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScreenRecording = sequelize.define('ScreenRecording', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roomId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  recordingData: {
    type: DataTypes.STRING, // stores file path (e.g., /uploads/recording_xxx.webm)
    allowNull: true
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // duration in seconds
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER, // file size in bytes
    allowNull: true
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  endedAt: {
    type: DataTypes.DATE,
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