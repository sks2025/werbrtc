import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import html2canvas from 'html2canvas';
import SignatureCanvas from 'react-signature-canvas';
import { consultationsAPI } from '../services/api';
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

  useEffect(() => {
    initializeCall();
    return () => {
      cleanup();
    };
  }, []);

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
      socketRef.current = io('ws://localhost:3001', {
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to signaling server');
        setIsConnected(true);
        socketRef.current.emit('join-room', { roomId, role, userInfo: currentUserInfo });
      });

      socketRef.current.on('room-joined', (data) => {
        console.log('Room joined successfully:', data);
        console.log('Other users in room:', data.users);
        
        // Check if room has too many users
        if (data.users && data.users.length > 1) {
          console.warn('Room has more than 2 users total, this may cause connection issues');
        }
        
        // Find the other user with different role
        const otherUser = data.users?.find(user => user.role !== role);
        
        if (otherUser && role === 'doctor') {
          console.log('Doctor found existing patient, creating offer...');
          setTimeout(() => {
            createOffer();
          }, 1000);
        } else if (otherUser && role === 'patient') {
          console.log('Patient joined room with existing doctor, waiting for offer...');
        } else if (!otherUser) {
          console.log('No other user with different role found, waiting...');
        }
      });

      socketRef.current.on('user-joined', (data) => {
        console.log('User joined:', data);
        console.log('Room users:', data.roomUsers);
        console.log('Current role:', role);
        console.log('Local stream ready:', !!localStreamRef.current);
        console.log('Peer connection ready:', !!peerConnectionRef.current);
        
        // Check if the new user has a different role
        const newUser = data.user;
        const shouldCreateOffer = role === 'doctor' && 
                                 newUser && 
                                 newUser.role === 'patient' && 
                                 localStreamRef.current && 
                                 peerConnectionRef.current &&
                                 !remoteUserConnected;
        
        if (shouldCreateOffer) {
          console.log('Doctor creating offer for new patient...');
          setTimeout(() => {
            createOffer();
          }, 1500);
        } else {
          console.log('Not creating offer - conditions not met:', {
            role,
            newUserRole: newUser?.role,
            localStream: !!localStreamRef.current,
            peerConnection: !!peerConnectionRef.current,
            alreadyConnected: remoteUserConnected
          });
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
      });

    } catch (error) {
      console.error('Error initializing call:', error);
      alert('Failed to initialize video call. Please check your camera and microphone permissions.');
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
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        console.log('Local video stream set successfully');
        
        // Ensure video element is visible
        localVideoRef.current.style.display = 'block';
        localVideoRef.current.style.visibility = 'visible';
        
        // Ensure video plays
        try {
          await localVideoRef.current.play();
          console.log('Local video is now playing');
        } catch (playError) {
          console.warn('Local video autoplay failed:', playError);
          // Try to play again after a short delay
          setTimeout(async () => {
            try {
              await localVideoRef.current.play();
              console.log('Local video play retry successful');
            } catch (retryError) {
              console.error('Local video play retry failed:', retryError);
            }
          }, 500);
        }
      } else {
        console.error('Local video ref is null!');
      }
      
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
          console.log('Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`));
          
          remoteVideoRef.current.srcObject = remoteStream;
          console.log('Remote video stream set successfully');
          
          // Set remote user connected only when we actually receive the stream
          setRemoteUserConnected(true);
          
          // Ensure remote video plays
          try {
            await remoteVideoRef.current.play();
            console.log('Remote video started playing');
          } catch (playError) {
            console.warn('Remote video autoplay failed:', playError);
            // Try to play after user interaction
            const playPromise = remoteVideoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Remote video play failed:', error);
              });
            }
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
        console.error('Peer connection not initialized');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('Already processing signaling, skipping offer creation');
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('Creating offer, current signaling state:', pc.signalingState);

      // Check if we can create an offer based on current state
      if (pc.signalingState !== 'stable') {
        console.warn('Cannot create offer in current state:', pc.signalingState);
        return;
      }

      setIsProcessingSignaling(true);

      // Ensure local stream is added to peer connection
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        const localTracks = localStreamRef.current.getTracks();
        
        // Add tracks if not already added
        localTracks.forEach(track => {
          const existingSender = senders.find(sender => sender.track === track);
          if (!existingSender) {
            console.log('Adding missing track to peer connection:', track.kind);
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      console.log('Creating offer...');
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      console.log('Setting local description...');
      await pc.setLocalDescription(offer);
      
      console.log('Sending offer to remote peer, new state:', pc.signalingState);
      socketRef.current.emit('offer', { roomId, offer });
    } catch (error) {
      console.error('Error creating offer:', error);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleOffer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('Peer connection not initialized');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('Already processing signaling, queuing offer...');
        // In a production app, you might want to queue this
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('Received offer, current signaling state:', pc.signalingState);

      // Check if we can handle the offer based on current state
      if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
        console.warn('Cannot handle offer in current state:', pc.signalingState);
        return;
      }

      // If we have a local offer pending, we need to handle collision
      if (pc.signalingState === 'have-local-offer') {
        console.log('Offer collision detected, handling gracefully...');
        // In a real implementation, you might want to compare offer timestamps
        // For now, we'll just ignore this offer to prevent the stable state error
        return;
      }

      setIsProcessingSignaling(true);

      // Ensure local stream is added to peer connection before handling offer
      if (localStreamRef.current) {
        const senders = pc.getSenders();
        const localTracks = localStreamRef.current.getTracks();
        
        // Add tracks if not already added
        localTracks.forEach(track => {
          const existingSender = senders.find(sender => sender.track === track);
          if (!existingSender) {
            console.log('Adding missing track to peer connection:', track.kind);
            pc.addTrack(track, localStreamRef.current);
          }
        });
      }

      console.log('Setting remote description...');
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      console.log('Creating answer...');
      const answer = await pc.createAnswer();
      
      console.log('Setting local description...');
      await pc.setLocalDescription(answer);
      
      console.log('Sending answer to remote peer');
      socketRef.current.emit('answer', { roomId, answer });
    } catch (error) {
      console.error('Error handling offer:', error);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleAnswer = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('Peer connection not initialized');
        return;
      }

      if (isProcessingSignaling) {
        console.warn('Already processing signaling, queuing answer...');
        return;
      }

      const pc = peerConnectionRef.current;
      console.log('Received answer, current signaling state:', pc.signalingState);

      // Check if we can handle the answer based on current state
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('Cannot handle answer in current state:', pc.signalingState);
        return;
      }

      setIsProcessingSignaling(true);

      console.log('Setting remote description with answer...');
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      console.log('Answer handled successfully, connection state:', pc.connectionState);
    } catch (error) {
      console.error('Error handling answer:', error);
    } finally {
      setIsProcessingSignaling(false);
    }
  };

  const handleIceCandidate = async (data) => {
    try {
      if (!peerConnectionRef.current) {
        console.error('Peer connection not initialized');
        return;
      }

      console.log('Received ICE candidate, adding to peer connection...');
      await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
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
    if (role !== 'doctor') return;

    try {
      const canvas = await html2canvas(document.querySelector('.video-container'));
      const imageData = canvas.toDataURL('image/png');
      const timestamp = new Date().toISOString();
      
      const newImage = {
        id: Date.now(),
        data: imageData,
        timestamp,
        patientInfo: userInfo
      };

      setCapturedImages(prev => [...prev, newImage]);
      alert('Image captured successfully!');
    } catch (error) {
      console.error('Error capturing image:', error);
      alert('Failed to capture image.');
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const saveSignature = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      console.log('Signature saved:', signatureData);
      alert('Signature saved successfully!');
      setShowSignature(false);
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
        </div>
        <button onClick={endCall} className="end-call-btn">
          End Call
        </button>
      </div>

      {/* React DevTools Notification - Only in development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          backgroundColor: '#e3f2fd',
          border: '1px solid #2196f3',
          borderRadius: '4px',
          padding: '8px 12px',
          margin: '10px',
          fontSize: '14px',
          color: '#1976d2'
        }}>
          💡 <strong>Development Tip:</strong> Install{' '}
          <a 
            href="https://react.dev/link/react-devtools" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#1976d2', textDecoration: 'underline' }}
          >
            React DevTools
          </a>{' '}
          for better debugging experience
        </div>
      )}

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
              console.log('Local video metadata loaded');
              console.log('Local video dimensions:', localVideoRef.current?.videoWidth, 'x', localVideoRef.current?.videoHeight);
            }}
            onCanPlay={() => {
              console.log('Local video can play');
              console.log('Local video ready state:', localVideoRef.current?.readyState);
            }}
            onError={(e) => console.error('Local video error:', e)}
            onPlay={() => console.log('Local video started playing')}
            onPause={() => console.log('Local video paused')}
          />
          <div className="video-label">You</div>
        </div>
      </div>

      <div className="call-controls">
        <button
          onClick={toggleMute}
          className={`control-btn ${isMuted ? 'muted' : ''}`}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>

        <button
          onClick={toggleVideo}
          className={`control-btn ${isVideoOff ? 'video-off' : ''}`}
        >
          {isVideoOff ? '📹' : '📷'}
        </button>

        {role === 'doctor' && (
          <button onClick={captureImage} className="control-btn capture-btn">
            📸 Capture
          </button>
        )}

        <button
          onClick={() => setShowSignature(true)}
          className="control-btn signature-btn"
        >
          ✍️ Sign
        </button>

        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          className="control-btn whiteboard-btn"
        >
          📝 Whiteboard
        </button>

        {role === 'doctor' && (
          <button
            onClick={() => setShowConsultationForm(true)}
            className="control-btn consultation-btn"
          >
            📋 Consultation
          </button>
        )}
      </div>

      {/* Signature Modal */}
      {showSignature && (
        <div className="modal-overlay">
          <div className="signature-modal">
            <h3>Digital Signature</h3>
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

      {/* Captured Images (Doctor only) */}
      {role === 'doctor' && capturedImages.length > 0 && (
        <div className="captured-images">
          <h3>Captured Images</h3>
          <div className="images-grid">
            {capturedImages.map((image) => (
              <div key={image.id} className="captured-image">
                <img src={image.data} alt="Captured" />
                <p>{new Date(image.timestamp).toLocaleString()}</p>
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
    </div>
  );
};

export default VideoCall;