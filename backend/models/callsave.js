const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CallSave = sequelize.define('CallSave', {
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
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  signatureUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'call_saves',
  timestamps: true
});

module.exports = CallSave;
