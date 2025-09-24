import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { roomsAPI } from '../services/api';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Email popup state
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [patientName, setPatientName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isEmailSending, setIsEmailSending] = useState(false);

  useEffect(() => {
    // Check if doctor is authenticated
    const storedDoctorInfo = localStorage.getItem('doctorInfo');
    const token = localStorage.getItem('doctorToken');
    
    if (!storedDoctorInfo || !token) {
      navigate('/login');
      return;
    }

    setDoctorInfo(JSON.parse(storedDoctorInfo));
    fetchRooms();
  }, [navigate]);

  const fetchRooms = async () => {
    try {
      const response = await roomsAPI.getMyRooms();
      if (response.data.success) {
        setRooms(response.data.data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const createVideoRoom = async () => {
    if (!roomName.trim()) {
      alert('Please enter a room name');
      return;
    }

    if (roomName.trim().length < 3) {
      alert('Room name must be at least 3 characters long');
      return;
    }

    if (roomName.trim().length > 100) {
      alert('Room name must be less than 100 characters');
      return;
    }

    setIsCreatingRoom(true);
    try {
      const response = await roomsAPI.createRoom({ roomName: roomName.trim() });
      
      if (response.data.success) {
        setRooms([response.data.data.room, ...rooms]);
        setRoomName('');
        alert('Room created successfully!');
      }
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const copyPatientLink = (link) => {
    navigator.clipboard.writeText(link).then(() => {
      alert('Patient link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link. Please copy manually.');
    });
  };

  const joinRoom = (roomId) => {
    navigate(`/video-call/${roomId}?role=doctor`);
  };

  const deleteRoom = async (roomId) => {
    try {
      await roomsAPI.deleteRoom(roomId);
      setRooms(rooms.filter(room => room.roomId !== roomId));
      alert('Room deleted successfully!');
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('doctorToken');
    localStorage.removeItem('doctorInfo');
    navigate('/login');
  };

  // Open email popup
  const openEmailPopup = (room) => {
    setSelectedRoom(room);
    setEmailAddress('');
    setPatientName('');
    setShowEmailPopup(true);
  };

  // Close email popup
  const closeEmailPopup = () => {
    setShowEmailPopup(false);
    setEmailAddress('');
    setPatientName('');
    setSelectedRoom(null);
    setIsEmailSending(false);
  };

  // Send email with meeting link
  const sendMeetingLinkEmail = async () => {
    if (!emailAddress.trim()) {
      alert('Please enter an email address');
      return;
    }

    if (!emailAddress.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setIsEmailSending(true);
    try {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");

      const raw = JSON.stringify({
        "to": emailAddress.trim(),
        "doctorName": `Dr. ${doctorInfo.email.split('@')[0]}`,
        "patientName": patientName.trim() || "Patient",
        "meetingLink": selectedRoom.patientLink,
        "roomId": selectedRoom.roomId,
        "appointmentDate": new Date().toISOString().split('T')[0],
        "appointmentTime": new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        "customMessage": `Room: ${selectedRoom.roomName}. Please join the video consultation at the scheduled time.`
      });

      const requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow"
      };

      const response = await fetch("https://api.stechooze.com/api/email/send-meeting-link", requestOptions);
      const result = await response.json();

      if (result.success) {
        alert(`Meeting link sent successfully to ${emailAddress}!`);
        closeEmailPopup();
      } else {
        alert(`Failed to send email: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please check your internet connection and try again.');
    } finally {
      setIsEmailSending(false);
    }
  };

  if (!doctorInfo) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="doctor-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Doctor Dashboard</h1>
          <div className="doctor-info">
            <span>Welcome, Dr. {doctorInfo.email}</span>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-container">
          <section className="create-room-section">
            <h2>Create Video Consultation Room</h2>
            <p>Create a new video consultation room and share the link with your patient.</p>
            <div className="room-form">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name (minimum 3 characters, e.g., Patient Consultation)"
                className="room-name-input"
                disabled={isCreatingRoom}
              />
              <button 
                onClick={createVideoRoom} 
                disabled={isCreatingRoom || !roomName.trim() || roomName.trim().length < 3}
                className="create-room-btn"
              >
                {isCreatingRoom ? 'Creating Room...' : 'Create New Room'}
              </button>
            </div>
          </section>

          <section className="rooms-section">
            <h2>Your Consultation Rooms</h2>
            {rooms.length === 0 ? (
              <div className="no-rooms">
                <p>No consultation rooms created yet.</p>
                <p>Create a new room to start video consultations with patients.</p>
              </div>
            ) : (
              <div className="rooms-grid">
                {rooms.map((room) => (
                  <div key={room.roomId} className="room-card">
                  <div className="room-header">
                    <h3>{room.roomName}</h3>
                    <span className={`status ${room.status}`}>{room.status}</span>
                  </div>
                  <div className="room-details">
                    <p><strong>Room ID:</strong> {room.roomId}</p>
                    <p><strong>Created:</strong> {new Date(room.createdAt).toLocaleString()}</p>
                    <div className="patient-link">
                      <label>Patient Link:</label>
                      <div className="link-container">
                        <input 
                          type="text" 
                          value={room.patientLink} 
                          readOnly 
                          className="link-input"
                        />
                        <button 
                          onClick={() => copyPatientLink(room.patientLink)}
                          className="copy-btn"
                        >
                          Copy
                        </button>
                        <button 
                          onClick={() => openEmailPopup(room)}
                          className="email-btn"
                          title="Send meeting link via email"
                        >
                          📧 Send Email
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="room-actions">
                    <button 
                      onClick={() => joinRoom(room.roomId)}
                      className="join-btn"
                    >
                      Join Room
                    </button>
                    <button 
                      onClick={() => deleteRoom(room.roomId)}
                      className="delete-btn"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Email Popup Modal */}
      {showEmailPopup && (
        <div className="email-popup-overlay">
          <div className="email-popup">
            <div className="email-popup-header">
              <h3>📧 Send Meeting Link via Email</h3>
              <button onClick={closeEmailPopup} className="close-popup-btn">✕</button>
            </div>
            
            <div className="email-popup-content">
              <div className="room-info">
                <p><strong>Room:</strong> {selectedRoom?.roomName}</p>
                <p><strong>Room ID:</strong> {selectedRoom?.roomId}</p>
              </div>

              <div className="email-form">
                <div className="form-group">
                  <label htmlFor="patient-email">Patient Email Address *</label>
                  <input
                    id="patient-email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter patient's email address"
                    className="email-input"
                    disabled={isEmailSending}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="patient-name">Patient Name (Optional)</label>
                  <input
                    id="patient-name"
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Enter patient's name"
                    className="email-input"
                    disabled={isEmailSending}
                  />
                </div>

                <div className="email-preview">
                  <p><strong>Meeting Link:</strong></p>
                  <div className="link-preview">{selectedRoom?.patientLink}</div>
                </div>
              </div>

              <div className="email-popup-actions">
                <button 
                  onClick={closeEmailPopup} 
                  className="cancel-email-btn"
                  disabled={isEmailSending}
                >
                  Cancel
                </button>
                <button 
                  onClick={sendMeetingLinkEmail} 
                  className="send-email-btn"
                  disabled={isEmailSending || !emailAddress.trim()}
                >
                  {isEmailSending ? '📤 Sending...' : '📧 Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;