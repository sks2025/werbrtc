const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { CapturedImage, DigitalSignature, ScreenRecording, RoomMedia, Room, Doctor, Patient } = require('../models');

// Save captured image
router.post('/capture-image', async (req, res) => {
  try {
    const { roomId, doctorId, patientId, imageData, fileName, description } = req.body;

    if (!roomId  || !imageData || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, doctorId, patientId, imageData, fileName' 
      });
    }

    const base64Data = imageData.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const folderPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    const filePath = path.join(folderPath, `image_${Date.now()}.png`);
    fs.writeFileSync(filePath, imageBuffer);
    const imageUrl = filePath;
    console.log(imageUrl)

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    const capturedImage = await CapturedImage.create({
      roomId: room.id, // Use the actual UUID from the roo
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
    // console.log("mmmsmsmms",recordingId, recordingData, duration, fileSize,"kskskkssk")

    const base64Data = recordingData.split(",")[1];

    const videoBuffer = Buffer.from(base64Data, "base64");


    const folderPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // File name unique रखना
    const filePath = path.join(folderPath, `recording_${Date.now()}.webm`);

    // Save file
    fs.writeFileSync(filePath, videoBuffer);

   

  

    await recording.update({
      recordingData: filePath,
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
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    };

    const signatureQuery = {
      where: { roomId: actualRoomId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['signedAt', 'DESC']]
    };

    const recordingQuery = {
      where: { roomId: actualRoomId },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
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

// ===== UNIFIED MEDIA ROUTES (NEW) =====

// Save any media type to unified RoomMedia table
router.post('/save-media', async (req, res) => {
  try {
    const { 
      roomId, 
      mediaType, 
      doctorId, 
      patientId, 
      mediaData, 
      fileName, 
      metadata = {},
      // Screen recording specific
      duration,
      fileSize,
      startedAt,
      endedAt,
      // Signature specific
      signedBy,
      purpose,
      // Image specific
      description,
      // Common
      status = 'completed'
    } = req.body;

    // Validate required fields
    if (!roomId || !mediaType || !mediaData) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, mediaType, mediaData' 
      });
    }

    // Validate mediaType
    if (!['screen_recording', 'digital_signature', 'captured_image'].includes(mediaType)) {
      return res.status(400).json({ 
        error: 'Invalid mediaType. Must be: screen_recording, digital_signature, or captured_image' 
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

    // Type-specific validation
    if (mediaType === 'digital_signature' && !signedBy) {
      return res.status(400).json({ error: 'signedBy is required for digital signatures' });
    }

    // Create unified media entry
    const mediaEntry = await RoomMedia.create({
      roomId: room.id, // Use the actual UUID from the room
      mediaType,
      doctorId,
      patientId,
      mediaData,
      fileName,
      metadata: {
        ...metadata,
        originalRoomId: roomId // Keep original roomId for reference
      },
      // Screen recording fields
      duration,
      fileSize,
      startedAt: startedAt ? new Date(startedAt) : null,
      endedAt: endedAt ? new Date(endedAt) : null,
      // Signature fields
      signedBy,
      purpose,
      // Image fields
      description,
      // Common fields
      status,
      capturedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: `${mediaType.replace('_', ' ')} saved successfully`,
      data: {
        id: mediaEntry.id,
        mediaType: mediaEntry.mediaType,
        fileName: mediaEntry.fileName,
        capturedAt: mediaEntry.capturedAt,
        status: mediaEntry.status
      }
    });
  } catch (error) {
    console.error('Error saving unified media:', error);
    res.status(500).json({ 
      error: 'Failed to save media',
      details: error.message 
    });
  }
});

// Get all room media from unified table
router.get('/room/:roomId/unified', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { role, userId, mediaType } = req.query;

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Build query
    const whereClause = { roomId: room.id };
    if (mediaType) {
      whereClause.mediaType = mediaType;
    }

    // Role-based filtering
    let mediaQuery = {
      where: whereClause,
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    };

    let media;
    if (role === 'doctor') {
      // Doctors can see all media
      media = await RoomMedia.findAll(mediaQuery);
    } else {
      // Patients have restricted access
      media = [];
      console.log(`Access restricted: Patient ${userId} attempted to access room ${roomId} media`);
    }

    // Group media by type for easier frontend handling
    const groupedMedia = {
      screen_recordings: media.filter(m => m.mediaType === 'screen_recording'),
      digital_signatures: media.filter(m => m.mediaType === 'digital_signature'),
      captured_images: media.filter(m => m.mediaType === 'captured_image'),
      all: media
    };

    res.status(200).json({
      success: true,
      data: groupedMedia,
      total: media.length,
      message: role === 'doctor' ? 'All media retrieved' : 'Access restricted to doctor-only content'
    });
  } catch (error) {
    console.error('Error fetching unified room media:', error);
    res.status(500).json({ 
      error: 'Failed to fetch room media',
      details: error.message 
    });
  }
});

// Update media status (for live recordings)
router.patch('/media/:mediaId/status', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { status, endedAt, duration, fileSize, mediaData } = req.body;

    const media = await RoomMedia.findByPk(mediaId);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    const updateData = { status };
    if (endedAt) updateData.endedAt = new Date(endedAt);
    if (duration) updateData.duration = duration;
    if (fileSize) updateData.fileSize = fileSize;
    if (mediaData) updateData.mediaData = mediaData;

    await media.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Media status updated successfully',
      data: {
        id: media.id,
        status: media.status,
        endedAt: media.endedAt
      }
    });
  } catch (error) {
    console.error('Error updating media status:', error);
    res.status(500).json({ 
      error: 'Failed to update media status',
      details: error.message 
    });
  }
});

// Save live recording chunks (for real-time streaming)
router.post('/media/:mediaId/chunk', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { chunkData, chunkIndex, timestamp } = req.body;

    const media = await RoomMedia.findByPk(mediaId);
    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Update live chunks array
    const currentChunks = media.liveChunks || [];
    currentChunks.push({
      index: chunkIndex,
      timestamp,
      size: chunkData.length,
      received_at: new Date()
    });

    await media.update({
      liveChunks: currentChunks,
      isLiveStreaming: true
    });

    res.status(200).json({
      success: true,
      message: 'Chunk saved successfully',
      chunkIndex,
      totalChunks: currentChunks.length
    });
  } catch (error) {
    console.error('Error saving media chunk:', error);
    res.status(500).json({ 
      error: 'Failed to save chunk',
      details: error.message 
    });
  }
});

module.exports = router;