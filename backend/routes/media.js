const express = require('express');
const router = express.Router();
const { CapturedImage, DigitalSignature, ScreenRecording, Room, Doctor, Patient } = require('../models');

// Save captured image
router.post('/capture-image', async (req, res) => {
  try {
    const { roomId, doctorId, patientId, imageData, fileName, description } = req.body;

    if (!roomId || !doctorId || !patientId || !imageData || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, doctorId, patientId, imageData, fileName' 
      });
    }

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    const capturedImage = await CapturedImage.create({
      roomId: room.id, // Use the actual UUID from the room
      doctorId,
      patientId,
      imageData,
      fileName,
      description: description || null
    });

    res.status(201).json({
      success: true,
      message: 'Image captured and saved successfully',
      data: {
        id: capturedImage.id,
        fileName: capturedImage.fileName,
        capturedAt: capturedImage.capturedAt
      }
    });
  } catch (error) {
    console.error('Error saving captured image:', error);
    res.status(500).json({ 
      error: 'Failed to save captured image',
      details: error.message 
    });
  }
});

// Save digital signature
router.post('/save-signature', async (req, res) => {
  try {
    const { roomId, signedBy, doctorId, patientId, signatureData, purpose } = req.body;

    if (!roomId || !signedBy || !signatureData) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, signedBy, signatureData' 
      });
    }

    if (signedBy === 'doctor' && !doctorId) {
      return res.status(400).json({ error: 'doctorId required when signedBy is doctor' });
    }

    if (signedBy === 'patient' && !patientId) {
      return res.status(400).json({ error: 'patientId required when signedBy is patient' });
    }

    // Find the actual room by roomId to get the UUID
    const { Room } = require('../models');
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    const signature = await DigitalSignature.create({
      roomId: room.id, // Use the actual UUID from the room
      signedBy,
      doctorId: signedBy === 'doctor' ? doctorId : null,
      patientId: signedBy === 'patient' ? patientId : null,
      signatureData,
      purpose: purpose || 'consultation_agreement'
    });

    res.status(201).json({
      success: true,
      message: 'Signature saved successfully',
      data: {
        id: signature.id,
        signedBy: signature.signedBy,
        signedAt: signature.signedAt
      }
    });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ 
      error: 'Failed to save signature',
      details: error.message 
    });
  }
});

// Start screen recording
router.post('/start-recording', async (req, res) => {
  try {
    const { roomId, doctorId, patientId } = req.body;

    if (!roomId || !doctorId) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, doctorId' 
      });
    }

    // Find the actual room by roomId to get the UUID
    const { Room } = require('../models');
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Get patientId from room if not provided
    const finalPatientId = patientId || room.patientId;
    
    if (!finalPatientId) {
      return res.status(400).json({ 
        error: 'Patient not found',
        details: 'No patient has joined this room yet'
      });
    }

    const recording = await ScreenRecording.create({
      roomId: room.id, // Use the actual UUID from the room
      doctorId,
      patientId: finalPatientId,
      recordingData: null, // Will be updated when recording is saved
      fileName: `recording_${roomId}_${Date.now()}.webm`,
      startedAt: new Date(),
      status: 'recording'
    });

    res.status(201).json({
      success: true,
      message: 'Recording started successfully',
      data: {
        recordingId: recording.id,
        fileName: recording.fileName,
        startedAt: recording.startedAt
      }
    });
  } catch (error) {
    console.error('Error starting recording:', error);
    res.status(500).json({ 
      error: 'Failed to start recording',
      details: error.message 
    });
  }
});

// Save screen recording
router.post('/save-recording', async (req, res) => {
  try {
    const { recordingId, recordingData, duration, fileSize } = req.body;

    if (!recordingId || !recordingData) {
      return res.status(400).json({ 
        error: 'Missing required fields: recordingId, recordingData' 
      });
    }

    const recording = await ScreenRecording.findByPk(recordingId);
    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    await recording.update({
      recordingData,
      duration: duration || null,
      fileSize: fileSize || null,
      endedAt: new Date(),
      status: 'completed'
    });

    res.status(200).json({
      success: true,
      message: 'Recording saved successfully',
      data: {
        id: recording.id,
        fileName: recording.fileName,
        duration: recording.duration,
        endedAt: recording.endedAt
      }
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ 
      error: 'Failed to save recording',
      details: error.message 
    });
  }
});

// Get room media (images, signatures, recordings) with role-based filtering
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { role, userId } = req.query; // Get role and userId from query params

    // Find the actual room by roomId to get the UUID
    const { Room } = require('../models');
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Use the actual room UUID for queries
    const actualRoomId = room.id;

    // Base queries for all media types
    const imageQuery = {
      where: { roomId: actualRoomId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    };

    const signatureQuery = {
      where: { roomId: actualRoomId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['signedAt', 'DESC']]
    };

    const recordingQuery = {
      where: { roomId: actualRoomId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['name', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['startedAt', 'DESC']]
    };

    // Role-based filtering
    let images, signatures, recordings;

    if (role === 'doctor') {
      // Doctors can see all media
      [images, signatures, recordings] = await Promise.all([
        CapturedImage.findAll(imageQuery),
        DigitalSignature.findAll(signatureQuery),
        ScreenRecording.findAll(recordingQuery)
      ]);
    } else {
      // Patients cannot see screen recordings, captured images, or signatures
      // They can only see their own signatures if needed
      images = [];
      recordings = [];
      signatures = [];
      
      console.log(`Access restricted: Patient ${userId} attempted to access room ${roomId} media`);
    }

    res.status(200).json({
      success: true,
      data: {
        images,
        signatures,
        recordings
      },
      message: role === 'doctor' ? 'All media retrieved' : 'Access restricted to doctor-only content'
    });
  } catch (error) {
    console.error('Error fetching room media:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room media',
      details: error.message 
    });
  }
});

module.exports = router;