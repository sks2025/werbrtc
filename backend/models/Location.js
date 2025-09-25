const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Location = sequelize.define('Location', {
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
  
  // Patient Location
  patientLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Patient latitude coordinate'
  },
  
  patientLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Patient longitude coordinate'
  },
  
  patientAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Patient readable address'
  },
  
  patientLocationTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When patient location was captured'
  },
  
  patientLocationAccuracy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Patient location accuracy in meters'
  },
  
  // Doctor Location
  doctorLatitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'Doctor latitude coordinate'
  },
  
  doctorLongitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'Doctor longitude coordinate'
  },
  
  doctorAddress: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Doctor readable address'
  },
  
  doctorLocationTimestamp: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When doctor location was captured'
  },
  
  doctorLocationAccuracy: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Doctor location accuracy in meters'
  },
  
  // Additional metadata
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {},
    comment: 'Additional location metadata'
  },
  
  // Location status
  status: {
    type: DataTypes.ENUM('active', 'completed', 'failed'),
    defaultValue: 'active',
    comment: 'Location tracking status'
  },
  
  // Distance between doctor and patient (calculated)
  distanceKm: {
    type: DataTypes.FLOAT,
    allowNull: true,
    comment: 'Distance between doctor and patient in kilometers'
  }
}, {
  tableName: 'locations',
  timestamps: true,
  indexes: [
    {
      fields: ['roomId']
    },
    {
      fields: ['patientLatitude', 'patientLongitude']
    },
    {
      fields: ['doctorLatitude', 'doctorLongitude']
    },
    {
      fields: ['createdAt']
    }
  ]
});

// Instance methods
Location.prototype.calculateDistance = function() {
  if (this.patientLatitude && this.patientLongitude && 
      this.doctorLatitude && this.doctorLongitude) {
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (this.doctorLatitude - this.patientLatitude) * Math.PI / 180;
    const dLon = (this.doctorLongitude - this.patientLongitude) * Math.PI / 180;
    
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.patientLatitude * Math.PI / 180) * 
              Math.cos(this.doctorLatitude * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    this.distanceKm = Math.round(distance * 100) / 100; // Round to 2 decimal places
    return this.distanceKm;
  }
  return null;
};

// Class methods
Location.findByRoomId = async function(roomId) {
  return await this.findOne({
    where: { roomId },
    order: [['createdAt', 'DESC']]
  });
};

Location.createOrUpdateLocation = async function(data) {
  const { roomId, role, latitude, longitude, address, accuracy } = data;
  
  let location = await this.findByRoomId(roomId);
  
  if (!location) {
    location = await this.create({
      roomId,
      metadata: {}
    });
  }
  
  const updateData = {};
  const timestamp = new Date();
  
  if (role === 'patient') {
    updateData.patientLatitude = latitude;
    updateData.patientLongitude = longitude;
    updateData.patientAddress = address;
    updateData.patientLocationTimestamp = timestamp;
    updateData.patientLocationAccuracy = accuracy;
  } else if (role === 'doctor') {
    updateData.doctorLatitude = latitude;
    updateData.doctorLongitude = longitude;
    updateData.doctorAddress = address;
    updateData.doctorLocationTimestamp = timestamp;
    updateData.doctorLocationAccuracy = accuracy;
  }
  
  await location.update(updateData);
  
  // Calculate distance if both locations are available
  location.calculateDistance();
  if (location.distanceKm !== null) {
    await location.save();
  }
  
  return location;
};

module.exports = Location;
