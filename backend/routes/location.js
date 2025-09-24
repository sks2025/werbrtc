const express = require('express');
const { Location, Room } = require('../models');
const router = express.Router();

// Save or update location for a room participant
router.post('/save', async (req, res) => {
  try {
    const {
      roomId,
      role, // 'doctor' or 'patient'
      latitude,
      longitude,
      address,
      accuracy
    } = req.body;

    // Validate required fields
    if (!roomId || !role || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: roomId, role, latitude, longitude'
      });
    }

    // Validate role
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "doctor" or "patient"'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    // Check if room exists
    const room = await Room.findOne({ where: { roomId } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Save or update location
    const location = await Location.createOrUpdateLocation({
      roomId: room.id, // Use the UUID, not roomId string
      role,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address,
      accuracy: accuracy ? parseFloat(accuracy) : null
    });

    res.json({
      success: true,
      message: `${role} location saved successfully`,
      data: {
        locationId: location.id,
        roomId: roomId,
        role: role,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address,
        accuracy: accuracy,
        distanceKm: location.distanceKm,
        timestamp: role === 'patient' ? location.patientLocationTimestamp : location.doctorLocationTimestamp
      }
    });

  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save location',
      error: error.message
    });
  }
});

// Get location data for a room
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists
    const room = await Room.findOne({ where: { roomId } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Get location data
    const location = await Location.findByRoomId(room.id);

    if (!location) {
      return res.json({
        success: true,
        message: 'No location data found for this room',
        data: {
          roomId: roomId,
          patient: null,
          doctor: null,
          distance: null
        }
      });
    }

    const locationData = {
      roomId: roomId,
      patient: location.patientLatitude && location.patientLongitude ? {
        latitude: parseFloat(location.patientLatitude),
        longitude: parseFloat(location.patientLongitude),
        address: location.patientAddress,
        timestamp: location.patientLocationTimestamp,
        accuracy: location.patientLocationAccuracy
      } : null,
      doctor: location.doctorLatitude && location.doctorLongitude ? {
        latitude: parseFloat(location.doctorLatitude),
        longitude: parseFloat(location.doctorLongitude),
        address: location.doctorAddress,
        timestamp: location.doctorLocationTimestamp,
        accuracy: location.doctorLocationAccuracy
      } : null,
      distance: location.distanceKm ? {
        kilometers: location.distanceKm,
        miles: Math.round(location.distanceKm * 0.621371 * 100) / 100
      } : null,
      status: location.status,
      lastUpdated: location.updatedAt
    };

    res.json({
      success: true,
      message: 'Location data retrieved successfully',
      data: locationData
    });

  } catch (error) {
    console.error('Error fetching location data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location data',
      error: error.message
    });
  }
});

// Get current location using browser geolocation (helper endpoint)
router.post('/get-current', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Reverse geocoding using a simple approach
    // In production, you might want to use Google Maps API or similar
    let address = `${latitude}, ${longitude}`;
    
    try {
      // You can integrate with geocoding service here
      // For now, we'll just format the coordinates
      address = `Lat: ${parseFloat(latitude).toFixed(6)}, Lng: ${parseFloat(longitude).toFixed(6)}`;
    } catch (geocodeError) {
      console.log('Geocoding failed, using coordinates:', geocodeError.message);
    }

    res.json({
      success: true,
      message: 'Location processed successfully',
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing current location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process location',
      error: error.message
    });
  }
});

// Update location status
router.patch('/status', async (req, res) => {
  try {
    const { roomId, status } = req.body;

    if (!roomId || !status) {
      return res.status(400).json({
        success: false,
        message: 'RoomId and status are required'
      });
    }

    if (!['active', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: active, completed, failed'
      });
    }

    // Find room
    const room = await Room.findOne({ where: { roomId } });
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    // Update location status
    const location = await Location.findByRoomId(room.id);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'No location data found for this room'
      });
    }

    await location.update({ status });

    res.json({
      success: true,
      message: 'Location status updated successfully',
      data: {
        roomId: roomId,
        status: status,
        updatedAt: location.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating location status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update location status',
      error: error.message
    });
  }
});

// Get all rooms with location data (for admin/analytics)
router.get('/all-rooms', async (req, res) => {
  try {
    const locations = await Location.findAll({
      include: [
        {
          model: Room,
          as: 'room',
          attributes: ['roomId', 'roomName', 'status', 'createdAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const locationData = locations.map(location => ({
      locationId: location.id,
      roomId: location.room?.roomId,
      roomName: location.room?.roomName,
      roomStatus: location.room?.status,
      patient: location.patientLatitude && location.patientLongitude ? {
        latitude: parseFloat(location.patientLatitude),
        longitude: parseFloat(location.patientLongitude),
        address: location.patientAddress,
        timestamp: location.patientLocationTimestamp
      } : null,
      doctor: location.doctorLatitude && location.doctorLongitude ? {
        latitude: parseFloat(location.doctorLatitude),
        longitude: parseFloat(location.doctorLongitude),
        address: location.doctorAddress,
        timestamp: location.doctorLocationTimestamp
      } : null,
      distance: location.distanceKm,
      status: location.status,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt
    }));

    res.json({
      success: true,
      message: 'All location data retrieved successfully',
      data: locationData,
      count: locationData.length
    });

  } catch (error) {
    console.error('Error fetching all location data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location data',
      error: error.message
    });
  }
});

module.exports = router;
