const express = require('express');
const jwt = require('jsonwebtoken');
const { Consultation, Room, Doctor, Patient } = require('../models');
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

// Create Consultation
router.post('/create', verifyDoctorToken, async (req, res) => {
  try {
    const {
      roomId,
      patientId,
      symptoms,
      diagnosis,
      prescription,
      notes,
      vitalSigns,
      consultationFee
    } = req.body;

    // Verify room belongs to doctor
    const room = await Room.findOne({
      where: { id: roomId, doctorId: req.doctor.id }
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found or unauthorized'
      });
    }

    const consultation = await Consultation.create({
      roomId,
      doctorId: req.doctor.id,
      patientId,
      symptoms,
      diagnosis,
      prescription,
      notes,
      vitalSigns,
      consultationFee,
      status: 'in_progress'
    });

    res.status(201).json({
      success: true,
      message: 'Consultation created successfully',
      data: { consultation }
    });

  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create consultation'
    });
  }
});

// Update Consultation
router.put('/:consultationId', verifyDoctorToken, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const updateData = req.body;

    const consultation = await Consultation.findOne({
      where: { id: consultationId, doctorId: req.doctor.id }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    await consultation.update(updateData);

    res.json({
      success: true,
      message: 'Consultation updated successfully',
      data: { consultation }
    });

  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update consultation'
    });
  }
});

// Save Captured Images
router.post('/:consultationId/images', verifyDoctorToken, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { images } = req.body; // Array of base64 images

    const consultation = await Consultation.findOne({
      where: { id: consultationId, doctorId: req.doctor.id }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    // Add new images to existing ones
    const existingImages = consultation.capturedImages || [];
    const updatedImages = [...existingImages, ...images];

    await consultation.update({
      capturedImages: updatedImages
    });

    res.json({
      success: true,
      message: 'Images saved successfully',
      data: { 
        totalImages: updatedImages.length,
        newImages: images.length
      }
    });

  } catch (error) {
    console.error('Save images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save images'
    });
  }
});

// Save Patient Signature
router.post('/:consultationId/signature', async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { signature } = req.body; // Base64 signature

    const consultation = await Consultation.findByPk(consultationId);

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    await consultation.update({
      patientSignature: signature
    });

    res.json({
      success: true,
      message: 'Signature saved successfully'
    });

  } catch (error) {
    console.error('Save signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save signature'
    });
  }
});

// Complete Consultation
router.post('/:consultationId/complete', verifyDoctorToken, async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { rating, feedback } = req.body;

    const consultation = await Consultation.findOne({
      where: { id: consultationId, doctorId: req.doctor.id }
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    await consultation.update({
      status: 'completed',
      rating,
      feedback
    });

    // Update room status
    await Room.update(
      { 
        status: 'completed',
        endTime: new Date()
      },
      { where: { id: consultation.roomId } }
    );

    res.json({
      success: true,
      message: 'Consultation completed successfully'
    });

  } catch (error) {
    console.error('Complete consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete consultation'
    });
  }
});

// Get Doctor's Consultations
router.get('/my-consultations', verifyDoctorToken, async (req, res) => {
  try {
    const consultations = await Consultation.findAll({
      where: { doctorId: req.doctor.id },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['name', 'age', 'phone']
        },
        {
          model: Room,
          as: 'room',
          attributes: ['roomName', 'roomId']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { consultations }
    });

  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultations'
    });
  }
});

// Get Consultation Details
router.get('/:consultationId', verifyDoctorToken, async (req, res) => {
  try {
    const { consultationId } = req.params;

    const consultation = await Consultation.findOne({
      where: { id: consultationId, doctorId: req.doctor.id },
      include: [
        {
          model: Patient,
          as: 'patient'
        },
        {
          model: Room,
          as: 'room'
        }
      ]
    });

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }

    res.json({
      success: true,
      data: { consultation }
    });

  } catch (error) {
    console.error('Get consultation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch consultation'
    });
  }
});

module.exports = router;