const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RoomMedia = sequelize.define('RoomMedia', {
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
  mediaType: {
    type: DataTypes.ENUM('screen_recording', 'digital_signature', 'captured_image'),
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
  mediaData: {
    type: DataTypes.TEXT('long'), // For base64 data, file paths, or large content
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB, // Store additional metadata as JSON
    allowNull: true,
    defaultValue: {}
  },
  // Screen recording specific fields
  duration: {
    type: DataTypes.INTEGER, // Duration in seconds
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER, // File size in bytes
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
  // Signature specific fields
  signedBy: {
    type: DataTypes.ENUM('doctor', 'patient'),
    allowNull: true
  },
  purpose: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Image specific fields
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // Common fields
  status: {
    type: DataTypes.ENUM('recording', 'completed', 'failed', 'processing'),
    allowNull: false,
    defaultValue: 'completed'
  },
  capturedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Live streaming support
  isLiveStreaming: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  liveChunks: {
    type: DataTypes.JSONB, // Store live chunk information
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'room_media',
  timestamps: true,
  indexes: [
    {
      fields: ['roomId', 'mediaType']
    },
    {
      fields: ['capturedAt']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = RoomMedia;
