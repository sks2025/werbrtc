import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';
import SignatureCanvas from 'react-signature-canvas';
import { consultationsAPI, mediaAPI } from '../services/api';
import locationService from '../services/locationService';
import './VideoCall.css';

const VideoCall = () => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const role = searchParams.get('role'); // 'doctor' or 'patient'

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const signatureRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showConsultationForm, setShowConsultationForm] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isProcessingSignaling, setIsProcessingSignaling] = useState(false);
  
  // Screen recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordingId, setRecordingId] = useState(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  
  // Media data display state
  const [showMediaData, setShowMediaData] = useState(false);
  const [roomMediaData, setRoomMediaData] = useState({
    images: [],
    signatures: [],
    recordings: []
  });
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  
  // Consultation data state
  const [consultationData, setConsultationData] = useState({
    symptoms: '',
    diagnosis: '',
    prescription: '',
    notes: '',
    vitalSigns: {
      bloodPressure: '',
      heartRate: '',
      temperature: '',
      weight: ''
    },
    followUpDate: '',
    followUpInstructions: ''
  });

  // Location tracking state
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [isLocationSaved, setIsLocationSaved] = useState(false);

  // WebRTC configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' }
    ],
    iceCandidatePoolSize: 10
  };

  // Check for pending stream when video element becomes available
  useEffect(() => {
    if (localVideoRef.current && window.pendingLocalStream) {
      console.log('🔄 Video element now available, setting pending stream...');
      localVideoRef.current.srcObject = window.pendingLocalStream;
      localVideoRef.current.style.display = 'block';
      localVideoRef.current.style.visibility = 'visible';
      
      localVideoRef.current.play()
        .then(() => {
          console.log('✅ Pending local video stream set and playing successfully');
          delete window.pendingLocalStream; // Clean up
        })
        .catch(error => {
          console.warn('⚠️ Failed to play pending stream:', error);
        });
    }
  }, [localVideoRef.current]); // Re-run when ref changes

  useEffect(() => {
    initializeCall();
    initializeLocationTracking();
    return () => {
      cleanup();
    };
  }, []);

  // Initialize location tracking
  const initializeLocationTracking = async () => {
    try {
      // Check if geolocation is supported
      if (!locationService.isGeolocationSupported()) {
        setLocationError('Geolocation is not supported by this browser');
        return;
      }

      // Request location permission
      const permissionGranted = await locationService.requestLocationPermission();
      setLocationPermissionGranted(permissionGranted);

      if (permissionGranted) {
        // Get current location
        const location = await locationService.getCurrentPosition();
        setCurrentLocation(location);
        console.log('📍 Current location obtained:', location);

        // Save location to backend
        try {
          await locationService.saveLocationToRoom(roomId, role, location);
          setIsLocationSaved(true);
          console.log('✅ Location saved to room');
        } catch (saveError) {
          console.error('❌ Failed to save location:', saveError);
          setLocationError('Failed to save location to server');
        }
      } else {
        setLocationError('Location permission denied');
      }
    } catch (error) {
      console.error('❌ Location initialization error:', error);
      setLocationError(error.message);
    }
  };

  // Auto-start recording for doctors when call becomes active
  useEffect(() => {
    if (role === 'doctor' && isCallActive && remoteUserConnected && !isRecording) {
      // Start recording automatically after a short delay
      const timer = setTimeout(() => {
        // startScreenRecording();
      }, 2000); // 2 second delay to ensure everything is ready

      return () => clearTimeout(timer);
    }
  }, [role, isCallActive, remoteUserConnected, isRecording]);

  const initializeCall = async () => {
    try {
      // Get user info based on role
      let currentUserInfo;
      if (role === 'doctor') {
        const doctorToken = localStorage.getItem('doctorToken');
        const doctorInfo = localStorage.getItem('doctorInfo');
        if (!doctorToken || !doctorInfo) {
          console.log('Doctor not authenticated, redirecting to login');
          navigate('/login');
          return;
        }
        const parsedDoctorInfo = JSON.parse(doctorInfo);
        currentUserInfo = { 
          email: parsedDoctorInfo.email, 
          name: parsedDoctorInfo.fullName || `Dr. ${parsedDoctorInfo.firstName} ${parsedDoctorInfo.lastName}`,
          role: 'doctor',
          id: parsedDoctorInfo.id
        };
        setUserInfo(currentUserInfo);
      } else if (role === 'patient') {
        const patientInfo = JSON.parse(sessionStorage.getItem('patientInfo') || '{}');
        if (!patientInfo.name) {
          navigate(`/patient-join/${roomId}`);
          return;
        }
        currentUserInfo = patientInfo;
        setUserInfo(patientInfo);
      }

      // Initialize peer connection first
      initializePeerConnection();

      // Get user media
      await getUserMedia();

      // Initialize Socket.io connection after media is ready
      console.log('Connecting to socket server at: https://api.stechooze.com');
      socketRef.current = io('https://api.stechooze.com', {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Connected to signaling server successfully');
        console.log('Socket ID:', socketRef.current.id);
        setIsConnected(true);
        socketRef.current.emit('join-room', { roomId, role, userInfo: currentUserInfo });
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.error('Connection failed to: https://api.stechooze.com');
        setIsConnected(false);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.warn('⚠️ Socket disconnected:', reason);
        setIsConnected(false);
        setRemoteUserConnected(false);
      });

      socketRef.current.on('reconnect', (attemptNumber) => {
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });

      socketRef.current.on('reconnect_error', (error) => {
        console.error('❌ Socket reconnection failed:', error);
      });

      socketRef.current.on('room-joined', (data) => {
        console.log('🏠 Room joined successfully:', data);
        console.log('👥 Other users in room:', data.users);
        console.log('🎭 My role:', role);
        
        // If doctor, fetch room details to get patient info
        if (role === 'doctor' && data.roomDetails) {
          const roomDetails = data.roomDetails;
          if (roomDetails.Patient) {
            // Store patient info in sessionStorage for doctor's use
            sessionStorage.setItem('patientInfo', JSON.stringify({
              id: roomDetails.Patient.id,
              name: roomDetails.Patient.name,
              age: roomDetails.Patient.age,
              phone: roomDetails.Patient.phone,
              roomId: roomId
            }));
            console.log('📋 Patient info stored for doctor:', roomDetails.Patient);
          }
        }
        
        // Check if room has too many users
        if (data.users && data.users.length > 1) {
          console.warn('⚠️ Room has more than 2 users total, this may cause connection issues');
        }
        
        // Find the other user with different role
        const otherUser = data.users?.find(user => user.role !== role);
        console.log('🔍 Looking for other user with different role...');
        console.log('🔍 Other user found:', otherUser);
        
        if (otherUser && role === 'doctor') {
          console.log('👨‍⚕️ Doctor found existing patient, creating offer in 2 seconds...');
          setTimeout(() => {
            console.log('📞 Doctor creating offer now...');
            createOffer();
          }, 2000); // Increased delay to ensure everything is ready
        } else if (otherUser && role === 'patient') {
          console.log('🤒 Patient joined room with existing doctor, waiting for offer...');
        } else if (!otherUser) {
          console.log('⏳ No other user with different role found, waiting for someone to join...');
        }
      });

      socketRef.current.on('user-joined', (data) => {
        console.log('👋 New user joined room:', data);
        console.log('🏠 Room users after join:', data.roomUsers);
        console.log('🎭 My role:', role);
        console.log('📹 Local stream ready:', !!localStreamRef.current);
        console.log('🔗 Peer connection ready:', !!peerConnectionRef.current);
        console.log('👥 Already connected to remote:', remoteUserConnected);
        
        // Check if the new user has a different role
        const newUser = data.user;
        console.log('🆕 New user details:', newUser);
        
        const shouldCreateOffer = role === 'doctor' && 
                                 newUser && 
                                 newUser.role === 'patient' && 
                                 localStreamRef.current && 
                                 peerConnectionRef.current &&
                                 !remoteUserConnected;
        
        console.log('🤔 Should create offer?', shouldCreateOffer);
        console.log('📋 Offer creation conditions:', {
          isDoctorRole: role === 'doctor',
          hasNewUser: !!newUser,
          newUserIsPatient: newUser?.role === 'patient',
          hasLocalStream: !!localStreamRef.current,
          hasPeerConnection: !!peerConnectionRef.current,
          notAlreadyConnected: !remoteUserConnected
        });
        
        if (shouldCreateOffer) {
          console.log('👨‍⚕️ Doctor creating offer for new patient in 3 seconds...');
          setTimeout(() => {
            console.log('📞 Creating offer for patient now...');
            createOffer();
          }, 3000); // Increased delay for better stability
        } else {
          console.log('⏳ Not creating offer - will wait or conditions not met');
        }
      });

      socketRef.current.on('offer', handleOffer);
      socketRef.current.on('answer', handleAnswer);
      socketRef.current.on('ice-candidate', handleIceCandidate);
      socketRef.current.on('user-left', () => {
        setRemoteUserConnected(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
      });

      socketRef.current.on('room-error', (data) => {
        console.error('Room error:', data);
        alert(`Room Error: ${data.message}`);
        // Redirect back to appropriate dashboard
        if (role === 'doctor') {
          navigate('/doctor-dashboard');
        } else {
          navigate('/login');
        }
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from signaling server');
        setIsConnected(false);
        
        // Auto-save recording if disconnected while recording
        if (isRecording && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Auto-saving recording due to disconnect');
          stopScreenRecording();
        }
      });

      // Recording status sync events
      socketRef.current.on('recording-started', (data) => {
        console.log('Recording started by:', data.userId);
        // Optionally show notification that recording started
      });

      socketRef.current.on('recording-stopped', (data) => {
        console.log('Recording stopped by:', data.userId);
        // Optionally show notification that recording stopped
      });

      // Live base64 streaming events
      socketRef.current.on('live-base64-chunk-received', (data) => {
        console.log('Live base64 chunk received:', {
          userId: data.userId,
          userName: data.userName,
          chunkIndex: data.chunkIndex,
          chunkSize: data.chunkSize,
          timestamp: data.timestamp
        });
        
        // Store received base64 data in clipboard or display
        if (data.base64Data && role !== 'doctor') {
          // For patient - show live data is being received
          console.log('Patient receiving live base64 data chunk');
        }
      });

      socketRef.current.on('live-base64-stream-complete', (data) => {
        console.log('Live base64 stream completed:', data);
        // Final base64 data is available
        if (data.completeBase64Data) {
          navigator.clipboard.writeText(data.completeBase64Data);
          console.log('Complete base64 data copied to clipboard');
          alert('Complete recording base64 data copied to clipboard!');
        }
      });

      // Handle live base64 stream data response
      socketRef.current.on('live-base64-stream-data', (data) => {
        console.log('Live base64 stream data received:', {
          totalChunks: data.totalChunks,
          metadata: data.metadata
        });
        
        if (data.completeBase64Data) {
          navigator.clipboard.writeText(data.completeBase64Data);
          console.log('Live base64 data copied to clipboard');
          alert(`Live base64 data copied to clipboard! (${data.totalChunks} chunks)`);
        }
      });

      socketRef.current.on('live-base64-stream-error', (error) => {
        console.error('Live base64 stream error:', error);
        alert(`Error getting live base64 data: ${error.error}`);
      });

      // Handle response for recording base64 data save
      socketRef.current.on('live-base64-stream-saved', (data) => {
        console.log('Recording base64 data saved successfully:', data);
        alert(`Recording saved! File: ${data.fileName}, Size: ${(data.fileSize / 1024 / 1024).toFixed(2)}MB`);
      });


      // Recording start response events
      socketRef.current.on('recording-start-success', (data) => {
        console.log('Recording started successfully:', data);
        setRecordingId(data.recordingId);
        setRecordingStartTime(new Date(data.startedAt));
        
        // Now start the actual recording
        if (window.tempRecorder && window.tempChunks) {
          const recorder = window.tempRecorder;
          const chunks = window.tempChunks;
          
          recorder.start(1000); // Collect data every second for live streaming
          setMediaRecorder(recorder);
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
          setRecordedChunks(chunks);
          
          // Performance monitoring
          const startTime = performance.now();
          recorder.onstart = () => {
            const initTime = performance.now() - startTime;
            console.log(`Recording started in ${initTime.toFixed(2)}ms`);
          };
          
          // Quality monitoring
          let totalChunks = 0;
          let totalSize = 0;
          const originalDataAvailable = recorder.ondataavailable;
          
          recorder.ondataavailable = (event) => {
            totalChunks++;
            totalSize += event.data.size;
            
            // Log recording stats every 10 chunks
            if (totalChunks % 10 === 0) {
              const avgChunkSize = (totalSize / totalChunks / 1024).toFixed(2);
              console.log(`Recording stats: ${totalChunks} chunks, avg size: ${avgChunkSize}KB`);
            }
            
            // Call original handler
            originalDataAvailable(event);
          };
          
          // Clean up temp variables
           delete window.tempRecorder;
           delete window.tempChunks;
           delete window.tempScreenStream;
           delete window.tempCombinedStream;
           
           // Emit recording started event via socket
           if (socketRef.current) {
             socketRef.current.emit('recording-started', {
               roomId,
               userId: userInfo?.id,
               userName: userInfo?.name,
               timestamp: new Date().toISOString()
             });
           }
           
           console.log('Screen recording started successfully');
        }
      });

      socketRef.current.on('recording-start-error', (data) => {
        console.error('Recording start failed:', data);
        alert(`Failed to start recording: ${data.error}`);
        setIsRecording(false);
        setMediaRecorder(null);
        mediaRecorderRef.current = null;
        setRecordedChunks([]);
        
        // Clean up temp variables
        delete window.tempRecorder;
        delete window.tempChunks;
        delete window.tempScreenStream;
        delete window.tempCombinedStream;
      });

    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to initialize video call. Please check your camera and microphone permissions.');
    }
  };

  // Helper function to get patient ID
  const getPatientId = () => {
    try {
      // First try to get from current userInfo if user is patient
      if (role === 'patient' && userInfo?.id) {
        return userInfo.id;
      }
      
      // If doctor, try to get patient info from sessionStorage
      const patientInfo = JSON.parse(sessionStorage.getItem('patientInfo') || '{}');
      if (patientInfo.id) {
        return patientInfo.id;
      }
      
      // Fallback - this should not happen in normal flow
      console.warn('Patient ID not found, using fallback');
      return null;
    } catch (error) {
      console.error('Error getting patient ID:', error);
      return null;
    }
  };

  const getUserMedia = async () => {
    try {
      console.log('Requesting user media...');
      
      // Try with ideal constraints first
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (idealError) {
        console.warn('Ideal constraints failed, trying basic constraints:', idealError);
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      }
      
      console.log('User media obtained successfully');
      console.log('Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
      localStreamRef.current = stream;
      
      // Wait for component to be fully mounted before setting video
      const setLocalVideo = async () => {
        // Multiple attempts to ensure ref is available
        for (let attempt = 1; attempt <= 5; attempt++) {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            console.log(`✅ Local video stream set successfully (attempt ${attempt})`);
            console.log('📱 Local video element ready:', !!localVideoRef.current);
            console.log('🎬 Stream active:', stream.active);
            console.log('🎯 Video tracks:', stream.getVideoTracks().length);
            console.log('🎵 Audio tracks:', stream.getAudioTracks().length);
            
            // Ensure video element is visible
            localVideoRef.current.style.display = 'block';
            localVideoRef.current.style.visibility = 'visible';
            console.log('👁️ Local video visibility set');
            
            // Ensure video plays
            try {
              await localVideoRef.current.play();
              console.log('▶️ Local video is now playing successfully');
              break; // Success, exit loop
            } catch (playError) {
              console.warn('⚠️ Local video autoplay failed:', playError);
              // Try to play again after a short delay
              setTimeout(async () => {
                try {
                  if (localVideoRef.current) {
                    await localVideoRef.current.play();
                    console.log('✅ Local video play retry successful');
                  }
                } catch (retryError) {
                  console.error('❌ Local video play retry failed:', retryError);
                }
              }, 500);
              break; // Exit loop even if play failed, stream is set
            }
          } else {
            console.warn(`⏳ Local video ref not ready yet (attempt ${attempt}/5), waiting...`);
            if (attempt < 5) {
              await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
            } else {
              console.error('❌ Local video ref is null after 5 attempts! Component may not be mounted properly.');
              // Store stream for later use when component mounts
              window.pendingLocalStream = stream;
              console.log('💾 Stored stream for later use when video element becomes available');
            }
          }
        }
      };

      await setLocalVideo();
      
      // Add tracks to peer connection if it exists
      addLocalStreamToPeerConnection();
      
      // Debug local video status
      setTimeout(() => {
        console.log('=== Local Video Debug Info ===');
        console.log('Local video element:', localVideoRef.current);
        console.log('Local video srcObject:', localVideoRef.current?.srcObject);
        console.log('Local video readyState:', localVideoRef.current?.readyState);
        console.log('Local video paused:', localVideoRef.current?.paused);
        console.log('Local video muted:', localVideoRef.current?.muted);
        console.log('Local stream tracks:', localStreamRef.current?.getTracks().map(t => `${t.kind}: ${t.enabled}`));
        console.log('===============================');
      }, 1000);
      
      setIsCallActive(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Please allow camera and microphone access to join the call. Make sure no other application is using your camera.');
      throw error;
    }
  };

  const initializePeerConnection = () => {
    try {
      peerConnectionRef.current = new RTCPeerConnection(iceServers);

      // Handle remote stream
      peerConnectionRef.current.ontrack = async (event) => {
        console.log('Received remote track:', event);
        console.log('Track kind:', event.track.kind);
        console.log('Track enabled:', event.track.enabled);
        console.log('Track readyState:', event.track.readyState);
        console.log('Streams:', event.streams);
        
        if (remoteVideoRef.current && event.streams[0]) {
          const remoteStream = event.streams[0];
          console.log('🎥 Received remote track event with stream');
          console.log('📹 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
          
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            console.log('✅ Remote video stream set successfully');
            
            // Set remote user connected only when we actually receive the stream
            setRemoteUserConnected(true);
            console.log('👥 Remote user connected - video should now be visible');
            
            // Ensure remote video plays
            try {
              await remoteVideoRef.current.play();
              console.log('▶️ Remote video started playing successfully');
            } catch (playError) {
              console.warn('⚠️ Remote video autoplay failed:', playError);
              // Try to play after user interaction
              const playPromise = remoteVideoRef.current.play();
              if (playPromise !== undefined) {
                playPromise.catch(error => {
                  console.error('❌ Remote video play failed:', error);
                });
              }
            }
          } else {
            console.error('❌ Remote video ref is null - cannot display video');
          }
        } else {
          console.warn('Remote video ref or stream not available');
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          console.log('Sending ICE candidate:', event.candidate);
          socketRef.current.emit('ice-candidate', {
            roomId,
            candidate: event.candidate
          });
        }
      };

      // Handle connection state changes
      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnectionRef.current.connectionState);
        if (peerConnectionRef.current.connectionState === 'connected') {
          console.log('Peer connection established successfully');
          console.log('Local tracks:', peerConnectionRef.current.getSenders().map(s => s.track?.kind));
          console.log('Remote tracks:', peerConnectionRef.current.getReceivers().map(r => r.track?.kind));
        } else if (peerConnectionRef.current.connectionState === 'failed') {
          console.error('Peer connection failed');
          // Try to restart ICE
          peerConnectionRef.current.restartIce();
        }
      };

      // Handle ICE connection state changes
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', peerConnectionRef.current.iceConnectionState);
      };

      console.log('Peer connection initialized successfully');
    } catch (error) {
      console.error('Error initializing peer connection:', error);
    }
  };

  const addLocalStreamToPeerConnection = () => {
    if (localStreamRef.current && peerConnectionRef.current) {
      console.log('Adding local stream tracks to peer connection');
      
      const senders = peerConnectionRef.current.getSenders();
      const localTracks = localStreamRef.current.getTracks();
      
      localTracks.forEach(track => {
        // Check if track is already added
        const existingSender = senders.find(sender => sender.track === track);
        if (!existingSender) {
          console.log('Adding track:', track.kind, track.enabled);
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        } else {
          console.log('Track already added:', track.kind);
        }
      });
    }
  };

  const createOffer = async () => {
    try {
      if (!peerConnectionRef.current) {
        console.error('❌ Peer connection not initialized - cannot create offer');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('⚠️ Already processing signaling, skipping offer creation');
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('📞 Creating offer...');
      console.log('🔗 Current signaling state:', pc.signalingState);
      console.log('🔗 Current connection state:', pc.connectionState);
      console.log('🔗 Current ICE connection state:', pc.iceConnectionState);

      // Check if we can create an offer based on current state
      if (pc.signalingState !== 'stable') {
        console.warn('⚠️ Cannot create offer in current state:', pc.signalingState);
        return;
      }

      setIsProcessingSignaling(true);

      // Ensure local stream is added to peer connection
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        const localTracks = localStreamRef.current.getTracks();
        
        console.log('🎥 Adding local tracks to peer connection...');
        console.log('📹 Available tracks:', localTracks.map(t => `${t.kind}: ${t.enabled}`));
        
        // Add tracks if not already added
        localTracks.forEach(track => {
          const existingSender = senders.find(sender => sender.track === track);
          if (!existingSender) {
            console.log(`➕ Adding ${track.kind} track to peer connection`);
            pc.addTrack(track, localStreamRef.current);
          } else {
            console.log(`✅ ${track.kind} track already added`);
          }
        });
        
        console.log('📋 Current senders:', pc.getSenders().length);
      } else {
        console.error('❌ No local stream available to add to peer connection');
      }

      console.log('🔄 Creating WebRTC offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('✅ Offer created successfully');
      console.log('📝 Setting local description...');
      await pc.setLocalDescription(offer);
      
      console.log('📡 Sending offer to remote peer via socket...');
      console.log('🏠 Room ID:', roomId);
      console.log('🔗 New signaling state:', pc.signalingState);
      
      socketRef.current.emit('offer', { roomId, offer });
      console.log('✅ Offer sent successfully!');
    } catch (error) {
      console.error('❌ Error creating offer:', error);
      console.error('📋 Error details:', error.message);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleOffer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('❌ Peer connection not initialized - cannot handle offer');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('⚠️ Already processing signaling, queuing offer...');
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('📨 Received offer from remote peer!');
      console.log('🔗 Current signaling state:', pc.signalingState);
      console.log('🔗 Current connection state:', pc.connectionState);

      // Check if we can handle the offer based on current state
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.warn('⚠️ Cannot handle offer in current state:', pc.signalingState);
        return;
      }

      // If we have a local offer pending, we need to handle collision
      if (pc.signalingState === 'have-local-offer') {
        console.log('⚡ Offer collision detected, handling gracefully...');
        // Patient should accept doctor's offer in case of collision
        if (role === 'patient') {
          console.log('🤒 Patient accepting doctor\'s offer (collision resolution)');
          // Continue to process the offer
        } else {
          console.log('👨‍⚕️ Doctor ignoring patient\'s offer (collision resolution)');
          return;
        }
      }

      setIsProcessingSignaling(true);

      // Ensure local stream is added to peer connection before handling offer
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        const localTracks = localStreamRef.current.getTracks();
        
        console.log('🎥 Adding local tracks before creating answer...');
        console.log('📹 Available tracks:', localTracks.map(t => `${t.kind}: ${t.enabled}`));
        
        // Add tracks if not already added
        localTracks.forEach(track => {
          const existingSender = senders.find(sender => sender.track === track);
          if (!existingSender) {
            console.log(`➕ Adding ${track.kind} track to peer connection`);
            pc.addTrack(track, localStreamRef.current);
          } else {
            console.log(`✅ ${track.kind} track already added`);
          }
        });
      }

      console.log('📝 Setting remote description with received offer...');
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      console.log('🔄 Creating answer for the offer...');
      const answer = await pc.createAnswer();
      
      console.log('📝 Setting local description with our answer...');
      await pc.setLocalDescription(answer);
      
      console.log('📡 Sending answer back to remote peer...');
      console.log('🏠 Room ID:', roomId);
      socketRef.current.emit('answer', { roomId, answer });
      console.log('✅ Answer sent successfully!');
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      console.error('📋 Error details:', error.message);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleAnswer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('❌ Peer connection not initialized - cannot handle answer');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('⚠️ Already processing signaling, queuing answer...');
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('📨 Received answer from remote peer!');
      console.log('🔗 Current signaling state:', pc.signalingState);
      console.log('🔗 Current connection state:', pc.connectionState);

      // Check if we can handle the answer based on current state
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('⚠️ Cannot handle answer in current state:', pc.signalingState);
        console.warn('Expected: have-local-offer, Got:', pc.signalingState);
        return;
      }

      setIsProcessingSignaling(true);

      console.log('📝 Setting remote description with received answer...');
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('✅ Answer handled successfully!');
      console.log('🔗 New connection state:', pc.connectionState);
      console.log('🔗 New signaling state:', pc.signalingState);
      console.log('🧊 ICE connection state:', pc.iceConnectionState);
    } catch (error) {
      console.error('❌ Error handling answer:', error);
      console.error('📋 Error details:', error.message);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('❌ Peer connection not initialized - cannot handle ICE candidate');
        return;
      }

      console.log('🧊 Received ICE candidate from remote peer');
      console.log('🔗 Current signaling state:', peerConnectionRef.current.signalingState);
      console.log('🧊 ICE candidate type:', data.candidate.candidate);
      
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('✅ ICE candidate added successfully');
      console.log('🧊 Updated ICE connection state:', peerConnectionRef.current.iceConnectionState);
    } catch (error) {
      console.error('❌ Error handling ICE candidate:', error);
      console.error('📋 Error details:', error.message);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const captureImage = async () => {
    // Both doctors and patients can capture images
    try {
      const canvas = await html2canvas(document.querySelector('.video-container'));
      const imageData = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString();
      
      const newImage = {
        id: Date.now(),
        data: imageData,
        timestamp,
        capturedBy: role,
        userInfo: userInfo
      };

      setCapturedImages(prev => [...prev, newImage]);
      
      // Save to database with role information
      await saveImageToDatabase(imageData, `${role}_capture_${Date.now()}.png`);
      alert(`Image captured and saved successfully by ${role}!`);
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Failed to capture image.');
    }
  };

  // Screen Recording Functions
  const startScreenRecording = async () => {
    if (role !== 'doctor' || isRecording) return;

    try {
      // Get screen capture stream with optimized settings
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 2
        }
      });

      // Combine screen video with microphone audio from existing stream
      const combinedStream = new MediaStream();
      
      // Add video track from screen capture
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        combinedStream.addTrack(videoTrack);
      }
      
      // Add audio track from microphone (existing local stream)
      if (localStreamRef.current) {
        const micAudioTrack = localStreamRef.current.getAudioTracks()[0];
        if (micAudioTrack) {
          combinedStream.addTrack(micAudioTrack);
          console.log('Added microphone audio to recording');
        }
      }
      
      // Also add system audio if available from screen capture
      const systemAudioTrack = screenStream.getAudioTracks()[0];
      if (systemAudioTrack) {
        // Create audio context to mix system audio with microphone
        const audioContext = new AudioContext();
        const micSource = localStreamRef.current ? audioContext.createMediaStreamSource(localStreamRef.current) : null;
        const systemSource = audioContext.createMediaStreamSource(new MediaStream([systemAudioTrack]));
        const destination = audioContext.createMediaStreamDestination();
        
        // Mix both audio sources
        if (micSource) {
          micSource.connect(destination);
        }
        systemSource.connect(destination);
        
        // Replace the audio track with mixed audio
        const mixedAudioTrack = destination.stream.getAudioTracks()[0];
        if (mixedAudioTrack) {
          // Remove existing audio tracks and add mixed audio
          combinedStream.getAudioTracks().forEach(track => combinedStream.removeTrack(track));
          combinedStream.addTrack(mixedAudioTrack);
          console.log('Added mixed audio (microphone + system) to recording');
        }
      }

      // Create MediaRecorder with optimized settings
      let mimeType = 'video/webm;codecs=vp9,opus';
      
      // Check for codec support and fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          console.warn('Falling back to basic webm format');
        }
      }
      
      console.log('Recording with MIME type:', mimeType);
      console.log('Combined stream tracks:', combinedStream.getTracks().map(t => `${t.kind}: ${t.label}`));
      
      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      });

      const chunks = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          
          // Live recording: Send chunk data via socket for real-time processing
          if (socketRef.current && event.data.size > 0) {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Data = reader.result;
              
              // Send live base64 chunk to server via socket
              socketRef.current.emit('recording-chunk', {
                roomId,
                mediaId: recordingId, // This will be available after recording starts
                userId: userInfo?.id,
                chunkData: base64Data, // Full base64 data
                timestamp: new Date().toISOString(),
                chunkIndex: chunks.length - 1,
                chunkSize: event.data.size,
                mimeType: event.data.type
              });

              // Also emit live-base64-chunk for real-time base64 streaming
              socketRef.current.emit('live-base64-chunk', {
                roomId,
                mediaId: recordingId,
                userId: userInfo?.id,
                userName: userInfo?.name,
                base64Data: base64Data,
                chunkIndex: chunks.length - 1,
                timestamp: new Date().toISOString(),
                chunkSize: event.data.size,
                mimeType: event.data.type,
                totalChunks: chunks.length
              });

              console.log(`Live base64 chunk ${chunks.length - 1} sent via socket (${(event.data.size / 1024).toFixed(2)}KB)`);
            };
            reader.readAsDataURL(event.data);
          }
        }
      };
      
      // Monitor stream status for live recording
      combinedStream.getVideoTracks().forEach(track => {
        track.onended = () => {
          console.log('Screen sharing ended by user');
          if (isRecording) {
            stopScreenRecording();
          }
        };
      });

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // Save to database via API
        await saveRecordingToDatabase(blob);
        
        // Also send via socket for live processing
        sendRecordingToServer(blob);
        
        // Stop all tracks from screen stream (but keep microphone running for video call)
        screenStream.getTracks().forEach(track => track.stop());
        combinedStream.getTracks().forEach(track => {
          // Only stop tracks that are not from the microphone
          if (track.kind === 'video' || (track.kind === 'audio' && !localStreamRef.current?.getAudioTracks().includes(track))) {
            track.stop();
          }
        });
        setIsRecording(false);
        setMediaRecorder(null);
        mediaRecorderRef.current = null;
        setRecordedChunks([]);
      };

      // Start recording via socket instead of API
      if (socketRef.current) {
        // Generate recording ID
        const recordingId = `recording_${roomId}_${Date.now()}`;
        
        // Store recorder, chunks, and streams for later use
        window.tempRecorder = recorder;
        window.tempChunks = chunks;
        window.tempScreenStream = screenStream;
        window.tempCombinedStream = combinedStream;
        
        // Emit recording start event via socket
        socketRef.current.emit('start-recording', {
          roomId,
          recordingId,
          doctorId: role === 'doctor' ? userInfo?.id : null,
          patientId: getPatientId(), // Get actual patient ID
          timestamp: new Date().toISOString()
        });
        
        // Recording will start in socket success event handler
        console.log('Recording start request sent via socket...');
      }
    } catch (error) {
      console.error('Error starting screen recording:', error);
      alert('Failed to start screen recording. Please allow screen sharing.');
    }
  };

  const stopScreenRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      
      // Emit recording stopped event via socket
      if (socketRef.current) {
        socketRef.current.emit('recording-stopped', {
          roomId,
          userId: userInfo?.id,
          userName: userInfo?.name,
          timestamp: new Date().toISOString()
        });

        // Complete live base64 stream
        if (recordingId) {
          socketRef.current.emit('complete-live-base64-stream', {
            roomId,
            mediaId: recordingId
          });
        }
      }
    }
  };

  const saveRecordingToDatabase = async (blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        const duration = recordingStartTime ? Math.floor((new Date() - recordingStartTime) / 1000) : 0;

        console.log(base64data)

        navigator.clipboard.writeText(base64data);
        
        const response = await fetch('https://api.stechooze.com/api/media/save-recording', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recordingId:roomId,
            recordingData: base64data,
            duration,
            fileSize: blob.size
          }),
        });

        const result = await response.json();
        if (result.success) {
          console.log('Recording saved to database successfully');
          alert('Screen recording saved successfully!');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error saving recording to database:', error);
      alert('Failed to save recording to database.');
    }
  };

  const saveImageToDatabase = async (imageData, fileName) => {
    try {
      const response = await fetch('https://api.stechooze.com/api/media/capture-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          doctorId: role === 'doctor' ? (userInfo?.id || 1) : null,
          patientId: role === 'patient' ? (userInfo?.id || getPatientId()) : null,
          imageData,
          fileName,
          capturedBy: role, // Add role information
          description: `Screen capture during consultation by ${role}`
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`Image saved to database successfully by ${role}`);
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to save image');
      }
    } catch (error) {
      console.error('Error saving image to database:', error);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const saveSignature = async () => {
    // Both doctors and patients can save signatures
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      
      // Debug information
      const doctorId = role === 'doctor' ? (userInfo?.id || 1) : null;
      const patientId = role === 'patient' ? (userInfo?.id || getPatientId()) : null;
      
      console.log('Signature save attempt:', {
        role,
        userInfo,
        doctorId,
        patientId,
        roomId
      });
      
      try {
        const requestBody = {
          roomId,
          signedBy: role,
          doctorId: doctorId,
          patientId: patientId,
          signatureData,
          purpose: 'consultation_agreement'
        };
        
        console.log('Signature request body:', requestBody);
        
        const response = await fetch('https://api.stechooze.com/api/media/save-signature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        if (result.success) {
          console.log(`${role} signature saved to database successfully`);
          alert(`${role} signature saved successfully!`);
          setShowSignature(false);
          
          // Clear the signature canvas
          signatureRef.current.clear();
        } else {
          throw new Error(result.error || 'Failed to save signature');
        }
      } catch (error) {
        console.error('Error saving signature:', error);
        alert('Failed to save signature to database.');
      }
    }
  };

  const handleConsultationChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setConsultationData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setConsultationData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const saveConsultation = async () => {
    if (role !== 'doctor') return;

    try {
      const consultationPayload = {
        roomId,
        ...consultationData,
        capturedImages: capturedImages.map(img => ({
          data: img.data,
          timestamp: img.timestamp
        })),
        patientSignature: signatureRef.current ? signatureRef.current.toDataURL() : null
      };

      const response = await consultationsAPI.createConsultation(consultationPayload);
      
      if (response.data.success) {
        alert('Consultation saved successfully!');
        setShowConsultationForm(false);
      }
    } catch (error) {
      console.error('Error saving consultation:', error);
      alert('Failed to save consultation. Please try again.');
    }
  };

  const endCall = () => {
    // Stop recording if active
    if (isRecording && role === 'doctor') {
      stopScreenRecording();
    }
    
    cleanup();
    if (role === 'doctor') {
      navigate('/doctor-dashboard');
    } else {
      navigate('/');
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Fetch room media data
  const fetchRoomMediaData = async () => {
    if (!roomId) return;
    
    setIsLoadingMedia(true);
    try {
      const response = await mediaAPI.getRoomMedia(roomId);
      if (response.data.success) {
        setRoomMediaData(response.data.data);
      } else {
        console.error('Failed to fetch media data:', response.data.error);
      }
    } catch (error) {
      console.error('Error fetching room media data:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Toggle media data display
  const toggleMediaDataDisplay = () => {
    // Role-based access control
    if (role !== 'doctor') {
      alert('Access denied. Only doctors can view room media data.');
      return;
    }
    
    if (!showMediaData) {
      fetchRoomMediaData();
    }
    setShowMediaData(!showMediaData);
  };

  // Get live base64 data via socket
  const getLiveBase64Data = () => {
    if (!socketRef.current || !recordingId) {
      alert('No active recording or socket connection');
      return;
    }
    
    socketRef.current.emit('get-live-base64-stream', {
      roomId,
      mediaId: recordingId
    });
    
    console.log('Requesting live base64 stream data...');
  };

  // Send complete recording base64 data to server
  const sendRecordingToServer = (blob) => {
    if (!socketRef.current || !blob) {
      console.error('No socket connection or blob data');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64data = reader.result;
      const duration = recordingStartTime ? Math.floor((new Date() - recordingStartTime) / 1000) : 0;

      console.log('Sending complete recording base64 data to server...');
      console.log(`Recording size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

      // Send via socket
      socketRef.current.emit('get-live-base64-stream-recording', {
        roomId,
        recording: base64data,
        duration: duration,
        fileSize: blob.size,
        timestamp: new Date().toISOString()
      });
    };
    
    reader.readAsDataURL(blob);
  };

  if (!isCallActive) {
    return (
      <div className="video-call loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Initializing video call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call">
      <div className="call-header">
        <div className="call-info">
          <h2>Video Consultation</h2>
          <span className="role-badge">{role === 'doctor' ? 'Doctor' : 'Patient'}</span>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          {role === 'doctor' && isRecording && (
            <span className="recording-status">
              🔴 Recording
            </span>
          )}
        </div>
        <div className="header-buttons">
          {role === 'doctor' && (
            <>
              <button 
                onClick={toggleMediaDataDisplay} 
                className="media-data-btn"
                disabled={isLoadingMedia}
              >
                {isLoadingMedia ? 'Loading...' : showMediaData ? 'Hide Data' : 'Show Room Data'}
              </button>
              <button 
                onClick={getLiveBase64Data} 
                className="live-base64-btn"
                disabled={!isRecording || !recordingId}
                title="Get live base64 data"
              >
                Get Live Base64
              </button>
              <button 
                onClick={() => {
                  if (recordedChunks.length > 0) {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    sendRecordingToServer(blob);
                  } else {
                    alert('No recorded chunks available');
                  }
                }}
                className="send-recording-btn"
                disabled={!recordedChunks || recordedChunks.length === 0}
                title="Send recording to server via socket"
              >
                Send Recording
              </button>
            </>
          )}
          <button onClick={endCall} className="end-call-btn">
            End Call
          </button>
        </div>
      </div>

      {/* React DevTools Notification - Only in development */}
      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <div>Room: {roomId}</div>
          <div>Role: {role}</div>
          <div>Socket: {isConnected ? '✅' : '❌'}</div>
          <div>Remote User: {remoteUserConnected ? '✅' : '❌'}</div>
          <div>Call Active: {isCallActive ? '✅' : '❌'}</div>
          <div>Local Stream: {localStreamRef.current ? '✅' : '❌'}</div>
          <div>Peer Connection: {peerConnectionRef.current ? '✅' : '❌'}</div>
          <div>Connection State: {peerConnectionRef.current?.connectionState || 'N/A'}</div>
          <div>ICE State: {peerConnectionRef.current?.iceConnectionState || 'N/A'}</div>
          <div>Signaling State: {peerConnectionRef.current?.signalingState || 'N/A'}</div>
          <div>User Info: {userInfo ? userInfo.name || userInfo.email : 'Loading...'}</div>
          <div>Socket ID: {socketRef.current?.id || 'Not connected'}</div>
          <div>Server: https://api.stechooze.com</div>
        </div>
      )}

      {/* Connection Status Indicator */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: isConnected ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)',
        border: `2px solid ${isConnected ? '#00ff00' : '#ff0000'}`,
        color: isConnected ? '#00ff00' : '#ff0000',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isConnected ? '#00ff00' : '#ff0000'
        }}></div>
        {isConnected ? 'LIVE' : 'DISCONNECTED'}
      </div>

      <div className="video-container">
        <div className="remote-video-container">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
            onLoadedMetadata={() => {
              console.log('Remote video metadata loaded');
              console.log('Remote video dimensions:', remoteVideoRef.current?.videoWidth, 'x', remoteVideoRef.current?.videoHeight);
            }}
            onCanPlay={() => {
              console.log('Remote video can play');
              console.log('Remote video ready state:', remoteVideoRef.current?.readyState);
            }}
            onPlay={() => console.log('Remote video started playing')}
            onPause={() => console.log('Remote video paused')}
            onWaiting={() => console.log('Remote video waiting for data')}
            onStalled={() => console.log('Remote video stalled')}
            onError={(e) => {
              console.error('Remote video error:', e);
              console.error('Remote video error details:', e.target.error);
            }}
          />
          {!remoteUserConnected && (
            <div className="waiting-message">
              <p>Waiting for {role === 'doctor' ? 'patient' : 'doctor'} to join...</p>
            </div>
          )}
        </div>

        <div className="local-video-container">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
            onLoadedMetadata={() => {
              console.log('📊 Local video metadata loaded');
              console.log('📐 Local video dimensions:', localVideoRef.current?.videoWidth, 'x', localVideoRef.current?.videoHeight);
              
              // Check if we have a pending stream to set
              if (window.pendingLocalStream && localVideoRef.current) {
                console.log('🔄 Setting pending stream on metadata load...');
                localVideoRef.current.srcObject = window.pendingLocalStream;
                delete window.pendingLocalStream;
              }
            }}
            onCanPlay={() => {
              console.log('✅ Local video can play');
              console.log('📊 Local video ready state:', localVideoRef.current?.readyState);
            }}
            onError={(e) => {
              console.error('❌ Local video error:', e);
              console.error('Error details:', e.target.error);
            }}
            onPlay={() => console.log('▶️ Local video started playing')}
            onPause={() => console.log('⏸️ Local video paused')}
            onLoadStart={() => console.log('🔄 Local video load started')}
            onWaiting={() => console.log('⏳ Local video waiting for data')}
          />
          <div className="video-label">You</div>
        </div>
      </div>

      <div className="call-controls">
        <button
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'muted' : ''}`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="btn-icon">{isMuted ? '🔇' : '🎤'}</span>
          <span className="btn-text">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
          title={isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
        >
          <span className="btn-icon">{isVideoOff ? '📹' : '📷'}</span>
          <span className="btn-text">{isVideoOff ? 'Video On' : 'Video Off'}</span>
        </button>

        {/* Both doctors and patients can capture images */}
        <button onClick={captureImage} className="control-btn capture-btn" title="Capture Screenshot">
          <span className="btn-icon">📸</span>
          <span className="btn-text">Capture</span>
        </button>

        {role === 'doctor' && (
          <button 
            onClick={isRecording ? stopScreenRecording : startScreenRecording} 
            className={`control-btn recording-btn ${isRecording ? 'recording-active' : ''}`}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            <span className="btn-icon">{isRecording ? '⏹️' : '🎥'}</span>
            <span className="btn-text">{isRecording ? 'Stop Rec' : 'Record'}</span>
          </button>
        )}

        {/* Both doctors and patients can create signatures */}
        <button
          onClick={() => {
            console.log(`${role} clicked signature button`);
            setShowSignature(true);
          }}
          className="control-btn signature-btn"
          title={`Digital Signature - ${role}`}
        >
          <span className="btn-icon">✍️</span>
          <span className="btn-text">{role === 'doctor' ? 'Dr. Sign' : 'Pat. Sign'}</span>
        </button>

        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className="control-btn whiteboard-btn"
          title="Open Whiteboard"
        >
          <span className="btn-icon">📝</span>
          <span className="btn-text">Whiteboard</span>
        </button>

        {role === 'doctor' && (
          <button
            onClick={() => setShowConsultationForm(true)}
            className="control-btn consultation-btn"
            title="Consultation Form"
          >
            <span className="btn-icon">📋</span>
            <span className="btn-text">Consultation</span>
          </button>
        )}
      </div>

      {/* Signature Modal (Both doctor and patient) */}
      {showSignature && (
        <div className="modal-overlay">
          <div className="signature-modal">
            <h3>Digital Signature - {role === 'doctor' ? 'Doctor' : 'Patient'}</h3>
            <div className="signature-container">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  width: 400,
                  height: 200,
                  className: 'signature-canvas'
                }}
              />
            </div>
            <div className="signature-controls">
              <button onClick={clearSignature} className="clear-btn">
                Clear
              </button>
              <button onClick={saveSignature} className="save-btn">
                Save
              </button>
              <button onClick={() => setShowSignature(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whiteboard */}
      {showWhiteboard && (
        <div className="whiteboard-container">
          <div className="whiteboard-header">
            <h3>Whiteboard</h3>
            <button onClick={() => setShowWhiteboard(false)} className="close-btn">
              ✕
            </button>
          </div>
          <div className="whiteboard">
            <p>Whiteboard functionality will be implemented here</p>
          </div>
        </div>
      )}

      {/* Captured Images (Both doctor and patient) */}
      {capturedImages.length > 0 && (
        <div className="captured-images">
          <h3>Captured Images by {role}</h3>
          <div className="images-grid">
            {capturedImages.map((image) => (
              <div key={image.id} className="captured-image">
                <img src={image.data} alt={`Captured by ${image.capturedBy || role}`} />
                <p>{new Date(image.timestamp).toLocaleString()}</p>
                <small>Captured by: {image.capturedBy || role}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consultation Form Modal (Doctor only) */}
      {showConsultationForm && role === 'doctor' && (
        <div className="modal-overlay">
          <div className="consultation-modal">
            <div className="modal-header">
              <h3>Consultation Details</h3>
              <button onClick={() => setShowConsultationForm(false)} className="close-btn">
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="form-section">
                <label>Patient Symptoms:</label>
                <textarea
                  value={consultationData.symptoms}
                  onChange={(e) => handleConsultationChange('symptoms', e.target.value)}
                  placeholder="Describe patient symptoms..."
                  rows="3"
                />
              </div>

              <div className="form-section">
                <label>Diagnosis:</label>
                <textarea
                  value={consultationData.diagnosis}
                  onChange={(e) => handleConsultationChange('diagnosis', e.target.value)}
                  placeholder="Enter diagnosis..."
                  rows="3"
                />
              </div>

              <div className="form-section">
                <label>Prescription:</label>
                <textarea
                  value={consultationData.prescription}
                  onChange={(e) => handleConsultationChange('prescription', e.target.value)}
                  placeholder="Enter prescription details..."
                  rows="4"
                />
              </div>

              <div className="form-section">
                <label>Additional Notes:</label>
                <textarea
                  value={consultationData.notes}
                  onChange={(e) => handleConsultationChange('notes', e.target.value)}
                  placeholder="Any additional notes..."
                  rows="3"
                />
              </div>

              <div className="vital-signs-section">
                <h4>Vital Signs</h4>
                <div className="vital-signs-grid">
                  <div className="vital-input">
                    <label>Blood Pressure:</label>
                    <input
                      type="text"
                      value={consultationData.vitalSigns.bloodPressure}
                      onChange={(e) => handleConsultationChange('vitalSigns.bloodPressure', e.target.value)}
                      placeholder="120/80"
                    />
                  </div>
                  <div className="vital-input">
                    <label>Heart Rate:</label>
                    <input
                      type="text"
                      value={consultationData.vitalSigns.heartRate}
                      onChange={(e) => handleConsultationChange('vitalSigns.heartRate', e.target.value)}
                      placeholder="72 bpm"
                    />
                  </div>
                  <div className="vital-input">
                    <label>Temperature:</label>
                    <input
                      type="text"
                      value={consultationData.vitalSigns.temperature}
                      onChange={(e) => handleConsultationChange('vitalSigns.temperature', e.target.value)}
                      placeholder="98.6°F"
                    />
                  </div>
                  <div className="vital-input">
                    <label>Weight:</label>
                    <input
                      type="text"
                      value={consultationData.vitalSigns.weight}
                      onChange={(e) => handleConsultationChange('vitalSigns.weight', e.target.value)}
                      placeholder="70 kg"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <label>Follow-up Date:</label>
                <input
                  type="date"
                  value={consultationData.followUpDate}
                  onChange={(e) => handleConsultationChange('followUpDate', e.target.value)}
                />
              </div>

              <div className="form-section">
                <label>Follow-up Instructions:</label>
                <textarea
                  value={consultationData.followUpInstructions}
                  onChange={(e) => handleConsultationChange('followUpInstructions', e.target.value)}
                  placeholder="Instructions for follow-up..."
                  rows="2"
                />
              </div>

              <div className="modal-actions">
                <button onClick={() => setShowConsultationForm(false)} className="cancel-btn">
                  Cancel
                </button>
                <button onClick={saveConsultation} className="save-btn">
                  Save Consultation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Data Display Modal */}
      {showMediaData && (
        <div className="modal-overlay">
          <div className="modal-content media-data-modal">
            <div className="modal-header">
              <h3>Room Media Data</h3>
              <button onClick={() => setShowMediaData(false)} className="close-btn">×</button>
            </div>
            <div className="modal-body">
              {isLoadingMedia ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading media data...</p>
                </div>
              ) : (
                <div className="media-data-content">
                  {/* Images Section */}
                  <div className="media-section">
                    <h4>Captured Images ({roomMediaData.images?.length || 0})</h4>
                    {roomMediaData.images?.length > 0 ? (
                      <div className="media-grid">
                        {roomMediaData.images.map((image, index) => (
                          <div key={index} className="media-item">
                            <img 
                              src={image.imageData} 
                              alt={`Captured ${index + 1}`}
                              className="media-thumbnail"
                            />
                            <div className="media-info">
                              <p>Captured by: {image.capturedBy}</p>
                              <p>Time: {new Date(image.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No images captured yet</p>
                    )}
                  </div>

                  {/* Signatures Section */}
                  <div className="media-section">
                    <h4>Digital Signatures ({roomMediaData.signatures?.length || 0})</h4>
                    {roomMediaData.signatures?.length > 0 ? (
                      <div className="media-grid">
                        {roomMediaData.signatures.map((signature, index) => (
                          <div key={index} className="media-item">
                            <img 
                              src={signature.signatureData} 
                              alt={`Signature ${index + 1}`}
                              className="media-thumbnail"
                            />
                            <div className="media-info">
                              <p>Signed by: {signature.signedBy}</p>
                              <p>Purpose: {signature.purpose}</p>
                              <p>Time: {new Date(signature.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No signatures created yet</p>
                    )}
                  </div>

                  {/* Recordings Section */}
                  <div className="media-section">
                    <h4>Screen Recordings ({roomMediaData.recordings?.length || 0})</h4>
                    {roomMediaData.recordings?.length > 0 ? (
                      <div className="media-list">
                        {roomMediaData.recordings.map((recording, index) => (
                          <div key={index} className="media-item recording-item">
                            <div className="recording-info">
                              <p><strong>Recording {index + 1}</strong></p>
                              <p>Duration: {recording.duration || 'Unknown'}</p>
                              <p>Started by: {recording.startedBy}</p>
                              <p>Time: {new Date(recording.createdAt).toLocaleString()}</p>
                            </div>
                            {recording.filePath && (
                              <a 
                                href={`https://api.stechooze.com${recording.filePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="download-btn"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-data">No recordings available yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;