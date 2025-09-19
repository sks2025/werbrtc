import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsAPI } from '../services/api';
import './PatientJoin.css';

const PatientJoin = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [patientInfo, setPatientInfo] = useState({
    name: '',
    age: '',
    phone: ''
  });
  const [isJoining, setIsJoining] = useState(false);
  const [roomExists, setRoomExists] = useState(null);

  useEffect(() => {
    fetchRoomDetails();
  }, [roomId]);

  const fetchRoomDetails = async () => {
    try {
      const response = await roomsAPI.getRoomDetails(roomId);
      if (response.data.success) {
        setRoomExists(true);
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
      setRoomExists(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPatientInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!patientInfo.name.trim()) {
      alert('Please enter your name');
      return false;
    }
    if (!patientInfo.age || patientInfo.age < 1 || patientInfo.age > 120) {
      alert('Please enter a valid age');
      return false;
    }
    if (!patientInfo.phone.trim()) {
      alert('Please enter your phone number');
      return false;
    }
    return true;
  };

  const joinVideoCall = async () => {
    if (!validateForm()) return;

    setIsJoining(true);
    
    try {
      const response = await roomsAPI.joinRoom(roomId, patientInfo);
      
      if (response.data.success) {
        // Store patient info for the session including the patient ID from backend
        sessionStorage.setItem('patientInfo', JSON.stringify({
          ...patientInfo,
          id: response.data.data.patient.id, // Store the patient UUID from backend
          roomId,
          joinedAt: new Date().toISOString()
        }));

        // Navigate to video call
        navigate(`/video-call/${roomId}?role=patient`);
      }
    } catch (error) {
      console.error('Error joining call:', error);
      alert('Failed to join the call. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (roomExists === null) {
    return (
      <div className="patient-join">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Checking room availability...</p>
        </div>
      </div>
    );
  }

  if (!roomExists) {
    return (
      <div className="patient-join">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Room Not Found</h2>
          <p>The consultation room you're trying to join doesn't exist or has been removed.</p>
          <p>Please check the link provided by your doctor and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="patient-join">
      <div className="join-container">
        <div className="join-header">
          <div className="medical-icon">🏥</div>
          <h1>Join Video Consultation</h1>
          <p>Please provide your information to join the consultation with your doctor</p>
        </div>

        <form className="join-form" onSubmit={(e) => { e.preventDefault(); joinVideoCall(); }}>
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={patientInfo.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age *</label>
            <input
              type="number"
              id="age"
              name="age"
              value={patientInfo.age}
              onChange={handleInputChange}
              placeholder="Enter your age"
              min="1"
              max="120"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={patientInfo.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
              required
            />
          </div>

          <div className="privacy-notice">
            <p>
              <strong>Privacy Notice:</strong> Your information will be used only for this consultation 
              and will be handled according to medical privacy standards.
            </p>
          </div>

          <button 
            type="submit" 
            className="join-btn"
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <div className="btn-spinner"></div>
                Joining...
              </>
            ) : (
              'Join Video Consultation'
            )}
          </button>
        </form>

        <div className="help-section">
          <h3>Before you join:</h3>
          <ul>
            <li>Make sure your camera and microphone are working</li>
            <li>Find a quiet, well-lit space for the consultation</li>
            <li>Have any relevant medical documents ready</li>
            <li>Ensure you have a stable internet connection</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PatientJoin;