import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { roomsAPI } from '../services/api';
import './DoctorDashboard.css';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  //  const [searchParams] = useSearchParams(); // ✅ array destructuring
  //   const cid = searchParams.get('cid'); 
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  

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
    // createVideoRoom(cid)
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
          //  const response = await roomsAPI.createRoom({ roomName: id.trim() });
      
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
          {/* <section className="create-room-section">
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
          </section> */}

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
    </div>
  );
};

export default DoctorDashboard;