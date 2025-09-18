const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Consultation = sequelize.define('Consultation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  symptoms: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  diagnosis: {
    type: DataTypes.TEXT
  },
  prescription: {
    type: DataTypes.TEXT
  },
  notes: {
    type: DataTypes.TEXT
  },
  vitalSigns: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  capturedImages: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: []
  },
  patientSignature: {
    type: DataTypes.TEXT // Base64 encoded signature
  },
  consultationDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  followUpRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  followUpDate: {
    type: DataTypes.DATE
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'cancelled'),
    defaultValue: 'in_progress'
  },
  rating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  },
  feedback: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'consultations',
  timestamps: true
});

module.exports = Consultation;