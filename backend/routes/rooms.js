const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Room, Doctor, Patient } = require('../models');
const router = express.Router();

// Middleware to verify doctor token
const verifyDoctorToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findByPk(decoded.doctorId);
    
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Create Room
router.post('/create', verifyDoctorToken, async (req, res) => {
  try {
    const { roomName } = req.body;
    const roomId = uuidv4();
    const patientLink = `${process.env.FRONTEND_URL || 'http://localhost:5174'}/patient-join/${roomId}`;

    const room = await Room.create({
      roomId,
      doctorId: req.doctor.id,
      roomName,
      patientLink,
      status: 'active'
    });

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: {
        room: {
          id: room.id,
          roomId: room.roomId,
          roomName: room.roomName,
          patientLink: room.patientLink,
          status: room.status,
          createdAt: room.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Room creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room'
    });
  }
});

// Get Doctor's Rooms
router.get('/my-rooms', verifyDoctorToken, async (req, res) => {
  try {
    const rooms = await Room.findAll({
      where: { doctorId: req.doctor.id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'name', 'age', 'phone']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { rooms }
    });

  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch rooms'
    });
  }
});

// Join Room (Patient)
router.post('/join/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, age, phone, email } = req.body;

    // Find room
    const room = await Room.findOne({
      where: { roomId, status: 'active' },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['firstName', 'lastName', 'specialization']
        }
      ]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or inactive'
      });
    }

    // Create or find patient
    let patient = await Patient.findOne({ where: { phone } });
    
    if (!patient) {
      patient = await Patient.create({
        name,
        age,
        phone,
        email
      });
    } else {
      // Update patient info
      await patient.update({ name, age, email });
    }

    // Update room with patient
    await room.update({
      patientId: patient.id,
      startTime: new Date()
    });

    res.json({
      success: true,
      message: 'Successfully joined room',
      data: {
        room: {
          id: room.id,
          roomId: room.roomId,
          roomName: room.roomName,
          doctor: room.doctor
        },
        patient: {
          id: patient.id,
          name: patient.name,
          age: patient.age,
          phone: patient.phone
        }
      }
    });

  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
});

// Get Room Details
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({
      where: { roomId },
      include: [
        {
          model: Doctor,
          as: 'doctor',
          attributes: ['firstName', 'lastName', 'specialization']
        },
        {
          model: Patient,
          as: 'patient',
          attributes: ['name', 'age', 'phone']
        }
      ]
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: { room }
    });

  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room details'
    });
  }
});

// Delete Room
router.delete('/:roomId', verifyDoctorToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findOne({
      where: { roomId, doctorId: req.doctor.id }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    await room.update({
      status: 'cancelled',
      endTime: new Date()
    });

    res.json({
      success: true,
      message: 'Room deleted successfully'
    });

  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room'
    });
  }
});

module.exports = router;