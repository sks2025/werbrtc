const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { CapturedImage, DigitalSignature, ScreenRecording, RoomMedia, Room, Doctor, Patient, Location } = require('../models');
const CallSave = require('../models/callsave');

// Save captured image (for both doctor and patient)
router.post('/capture-image', async (req, res) => {
  try {
    const { roomId, doctorId, patientId, imageData, fileName, description, capturedBy, role } = req.body;

    if (!roomId || !imageData || !fileName || !capturedBy) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, imageData, fileName, capturedBy' 
      });
    }

    // Validate capturedBy field
    if (!['doctor', 'patient'].includes(capturedBy)) {
      return res.status(400).json({ 
        error: 'capturedBy must be either "doctor" or "patient"' 
      });
    }

    // Save image file
    const base64Data = imageData.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");
    const folderPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    
    // Create unique filename with role prefix
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'png';
    const uniqueFileName = `${capturedBy}_image_${timestamp}.${fileExtension}`;
    const filePath = path.join(folderPath, uniqueFileName);
    
    fs.writeFileSync(filePath, imageBuffer);
    console.log(`Image saved: ${filePath} by ${capturedBy}`);

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Set the appropriate ID based on who captured the image
    const imageData_final = {
      roomId: room.id,
      imageData: `/uploads/${uniqueFileName}`, // Store file path instead of base64
      fileName: uniqueFileName,
      description: description || null,
      capturedBy: capturedBy,
      doctorId: capturedBy === 'doctor' ? doctorId : null,
      patientId: capturedBy === 'patient' ? patientId : null
    };

    const capturedImage = await CapturedImage.create(imageData_final);

    res.status(201).json({
      success: true,
      message: `Image captured and saved successfully by ${capturedBy}`,
      data: {
        id: capturedImage.id,
        fileName: capturedImage.fileName,
        capturedBy: capturedImage.capturedBy,
        imageUrl: `/uploads/${uniqueFileName}`,
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

// Save digital signature (for both doctor and patient)
router.post('/save-signature', async (req, res) => {
  try {
    const { roomId, signedBy, doctorId, patientId, signatureData, purpose } = req.body;

    if (!roomId || !signedBy || !signatureData) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, signedBy, signatureData' 
      });
    }

    // Validate signedBy field
    if (!['doctor', 'patient'].includes(signedBy)) {
      return res.status(400).json({ 
        error: 'signedBy must be either "doctor" or "patient"' 
      });
    }

    // Save signature as image file
    const base64Data = signatureData.split(",")[1];
    const signatureBuffer = Buffer.from(base64Data, "base64");
    const folderPath = path.join(__dirname, "uploads");
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }
    
    // Create unique filename with role prefix
    const timestamp = Date.now();
    const uniqueFileName = `${signedBy}_signature_${timestamp}.png`;
    const filePath = path.join(folderPath, uniqueFileName);
    
    fs.writeFileSync(filePath, signatureBuffer);
    console.log(`Signature saved: ${filePath} by ${signedBy}`);

    // Find the actual room by roomId to get the UUID
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
      signatureData: `/uploads/${uniqueFileName}`, // Store file path instead of base64
      purpose: purpose || 'consultation_agreement'
    });

    res.status(201).json({
      success: true,
      message: `${signedBy} signature saved successfully`,
      data: {
        id: signature.id,
        signedBy: signature.signedBy,
        signatureUrl: `/uploads/${uniqueFileName}`,
        purpose: signature.purpose,
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
    const fileName = `recording_${Date.now()}.webm`;
    const filePath = path.join(folderPath, fileName);

    // Save file
    fs.writeFileSync(filePath, videoBuffer);
    console.log('Recording saved to:', filePath);

    await CallSave.create({
      recordingData: `/uploads/${fileName}`, // Store relative path, not full system path
      fileName: fileName,
      duration: duration || null,
      fileSize: fileSize || null,
      startedAt: new Date(), // Add start time
      endedAt: new Date(),
      status: 'completed',
      roomId: recordingId
    });

    // Get the created record to return proper data
    const savedRecording = await CallSave.findOne({
      where: { roomId: recordingId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'Recording saved successfully',
      data: {
        id: savedRecording.id,
        fileName: savedRecording.fileName,
        recordingUrl: savedRecording.recordingData,
        duration: savedRecording.duration,
        endedAt: savedRecording.endedAt
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

    // Determine role-based file handling
    let finalMediaData = mediaData;
    let finalFileName = fileName;

    // Save media files with role prefix for images and signatures
    if (mediaType === 'captured_image' || mediaType === 'digital_signature') {
      const capturedBy = signedBy || (doctorId ? 'doctor' : 'patient');
      
      if (mediaData.includes('data:')) {
        // Handle base64 data
        const base64Data = mediaData.split(",")[1];
        const mediaBuffer = Buffer.from(base64Data, "base64");
        const folderPath = path.join(__dirname, "uploads");
        
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
        }
        
        const timestamp = Date.now();
        const fileExtension = mediaType === 'captured_image' ? 'png' : 'png';
        const uniqueFileName = `${capturedBy}_${mediaType}_${timestamp}.${fileExtension}`;
        const filePath = path.join(folderPath, uniqueFileName);
        
        fs.writeFileSync(filePath, mediaBuffer);
        
        finalMediaData = `/uploads/${uniqueFileName}`;
        finalFileName = uniqueFileName;
        
        console.log(`${mediaType} saved: ${filePath} by ${capturedBy}`);
      }
    }

    // Create unified media entry
    const mediaEntry = await RoomMedia.create({
      roomId: room.id, // Use the actual UUID from the room
      mediaType,
      doctorId: mediaType === 'digital_signature' && signedBy === 'doctor' ? doctorId : 
               mediaType === 'captured_image' && doctorId ? doctorId : null,
      patientId: mediaType === 'digital_signature' && signedBy === 'patient' ? patientId : 
                mediaType === 'captured_image' && patientId ? patientId : null,
      mediaData: finalMediaData,
      fileName: finalFileName,
      metadata: {
        ...metadata,
        originalRoomId: roomId, // Keep original roomId for reference
        capturedBy: signedBy || (doctorId ? 'doctor' : 'patient')
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

// Get images by role (doctor or patient)
router.get('/room/:roomId/images/:role', async (req, res) => {
  try {
    const { roomId, role } = req.params;
    
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role must be either "doctor" or "patient"' 
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

    const images = await CapturedImage.findAll({
      where: { 
        roomId: room.id,
        capturedBy: role
      },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: images,
      count: images.length,
      message: `${role} images retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching images by role:', error);
    res.status(500).json({ 
      error: 'Failed to fetch images',
      details: error.message 
    });
  }
});

// Get signatures by role (doctor or patient)
router.get('/room/:roomId/signatures/:role', async (req, res) => {
  try {
    const { roomId, role } = req.params;
    
    if (!['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ 
        error: 'Role must be either "doctor" or "patient"' 
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

    const signatures = await DigitalSignature.findAll({
      where: { 
        roomId: room.id,
        signedBy: role
      },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] },
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['signedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: signatures,
      count: signatures.length,
      message: `${role} signatures retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching signatures by role:', error);
    res.status(500).json({ 
      error: 'Failed to fetch signatures',
      details: error.message 
    });
  }
});

// Get all media separated by role
router.get('/room/:roomId/media-by-role', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { requestingRole } = req.query; // Role of the person making the request

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Get images by role
    const doctorImages = await CapturedImage.findAll({
      where: { roomId: room.id, capturedBy: 'doctor' },
      order: [['capturedAt', 'DESC']]
    });

    const patientImages = await CapturedImage.findAll({
      where: { roomId: room.id, capturedBy: 'patient' },
      order: [['capturedAt', 'DESC']]
    });

    // Get signatures by role
    const doctorSignatures = await DigitalSignature.findAll({
      where: { roomId: room.id, signedBy: 'doctor' },
      order: [['signedAt', 'DESC']]
    });

    const patientSignatures = await DigitalSignature.findAll({
      where: { roomId: room.id, signedBy: 'patient' },
      order: [['signedAt', 'DESC']]
    });

    // Role-based access control
    let responseData;
    if (requestingRole === 'doctor') {
      // Doctors can see everything
      responseData = {
        doctor: {
          images: doctorImages,
          signatures: doctorSignatures
        },
        patient: {
          images: patientImages,
          signatures: patientSignatures
        }
      };
    } else {
      // Patients can only see their own media
      responseData = {
        patient: {
          images: patientImages,
          signatures: patientSignatures
        }
      };
    }

    res.status(200).json({
      success: true,
      data: responseData,
      message: `Media retrieved successfully for ${requestingRole || 'user'}`
    });
  } catch (error) {
    console.error('Error fetching media by role:', error);
    res.status(500).json({ 
      error: 'Failed to fetch media',
      details: error.message 
    });
  }
});



router.get('/all-media/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    // Find the actual room by roomId to get the UUID
    const room = await Room.findOne({ where: { roomId: roomId } });
    if (!room) {
      return res.status(404).json({ 
        error: 'Room not found',
        details: `Room with ID ${roomId} does not exist`
      });
    }

    // Get all recordings from CallSave table
    const recordings = await CallSave.findAll({
      where: { roomId: roomId },
      order: [['createdAt', 'DESC']]
    });

    // Get doctor signatures
    const doctorSignatures = await DigitalSignature.findAll({
      where: { 
        roomId: room.id,
        signedBy: 'doctor'
      },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['signedAt', 'DESC']]
    });

    // Get patient signatures
    const patientSignatures = await DigitalSignature.findAll({
      where: { 
        roomId: room.id,
        signedBy: 'patient'
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['signedAt', 'DESC']]
    });

    // Get doctor images
    const doctorImages = await CapturedImage.findAll({
      where: { 
        roomId: room.id,
        capturedBy: 'doctor'
      },
      include: [
        { model: Doctor, as: 'doctor', attributes: ['firstName', 'lastName', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    });

    // Get patient images
    const patientImages = await CapturedImage.findAll({
      where: { 
        roomId: room.id,
        capturedBy: 'patient'
      },
      include: [
        { model: Patient, as: 'patient', attributes: ['name', 'email'] }
      ],
      order: [['capturedAt', 'DESC']]
    });

    // Get location data for the room
    const locationData = await Location.findOne({
      where: { roomId: room.id },
      order: [['createdAt', 'DESC']]
    });

    // Prepare response data
    const allMediaData = {
      roomId: roomId,
      recordings: recordings.map(recording => ({
        id: recording.id,
        fileName: recording.fileName,
        recordingUrl: recording.recordingData,
        duration: recording.duration,
        fileSize: recording.fileSize,
        startedAt: recording.startedAt,
        endedAt: recording.endedAt,
        status: recording.status,
        createdAt: recording.createdAt
      })),
      doctorSignatures: doctorSignatures.map(signature => ({
        id: signature.id,
        signatureUrl: signature.signatureData,
        purpose: signature.purpose,
        signedAt: signature.signedAt,
        doctor: signature.doctor
      })),
      patientSignatures: patientSignatures.map(signature => ({
        id: signature.id,
        signatureUrl: signature.signatureData,
        purpose: signature.purpose,
        signedAt: signature.signedAt,
        patient: signature.patient
      })),
      doctorImages: doctorImages.map(image => ({
        id: image.id,
        imageUrl: image.imageData,
        fileName: image.fileName,
        description: image.description,
        capturedAt: image.capturedAt,
        doctor: image.doctor
      })),
      patientImages: patientImages.map(image => ({
        id: image.id,
        imageUrl: image.imageData,
        fileName: image.fileName,
        description: image.description,
        capturedAt: image.capturedAt,
        patient: image.patient
      })),
      locationData: locationData ? {
        patient: locationData.patientLatitude && locationData.patientLongitude ? {
          latitude: parseFloat(locationData.patientLatitude),
          longitude: parseFloat(locationData.patientLongitude),
          address: locationData.patientAddress,
          timestamp: locationData.patientLocationTimestamp,
          accuracy: locationData.patientLocationAccuracy
        } : null,
        doctor: locationData.doctorLatitude && locationData.doctorLongitude ? {
          latitude: parseFloat(locationData.doctorLatitude),
          longitude: parseFloat(locationData.doctorLongitude),
          address: locationData.doctorAddress,
          timestamp: locationData.doctorLocationTimestamp,
          accuracy: locationData.doctorLocationAccuracy
        } : null,
        distance: locationData.distanceKm ? {
          kilometers: locationData.distanceKm,
          miles: Math.round(locationData.distanceKm * 0.621371 * 100) / 100
        } : null,
        status: locationData.status,
        capturedAt: locationData.createdAt,
        lastUpdated: locationData.updatedAt
      } : null,
      summary: {
        totalRecordings: recordings.length,
        totalDoctorSignatures: doctorSignatures.length,
        totalPatientSignatures: patientSignatures.length,
        totalDoctorImages: doctorImages.length,
        totalPatientImages: patientImages.length,
        totalMediaItems: recordings.length + doctorSignatures.length + patientSignatures.length + doctorImages.length + patientImages.length,
        hasLocationData: !!locationData
      }
    };

    res.status(200).json({ 
      success: true, 
      data: allMediaData,
      message: `All media data retrieved for room ${roomId}`
    });
  } catch (error) {
    console.error('Error fetching all media:', error);
    res.status(500).json({ 
      error: 'Failed to fetch all media data', 
      details: error.message 
    });
  }
});

module.exports = router;