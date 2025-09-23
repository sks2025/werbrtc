import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await authAPI.login(formData);
      
      if (response.data.success) {
        // Store token and doctor info
        localStorage.setItem('doctorToken', response.data.data.token);
        localStorage.setItem('doctorInfo', JSON.stringify(response.data.data.doctor));
        
        alert(`Welcome ${response.data.data.doctor.fullName}!`);
        navigate('/doctor-dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: error.response?.data?.message || 'Login failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Please sign in to your account</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`form-input ${errors.password ? 'error' : ''}`}
              placeholder="Enter your password"
            />
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>
          
          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="login-footer">
          <a href="#" className="forgot-password">Forgot your password?</a>
          <p className="signup-text">Don't have an account? <Link to="/signup" className="signup-link">Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;



// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
// import { authAPI } from '../services/api';
// import './Login.css';

// const Login = () => {
//   const navigate = useNavigate();
//   const { email, password } = useParams(); // 👈 get from URL
//  const [searchParams] = useSearchParams(); // ✅ array destructuring
//   const cid = searchParams.get('cid'); 
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const autoLogin = async () => {
//       try {
//         const response = await authAPI.login({ email, password });

//         if (response.data.success) {
//           // Store token and doctor info
//           localStorage.setItem('doctorToken', response.data.data.token);
//           localStorage.setItem('doctorInfo', JSON.stringify(response.data.data.doctor));

//           // Navigate after success
//           navigate(`/doctor-dashboard?cid=${cid}`);
//         }
//       } catch (error) {
//         console.error('Login error:', error);
//         alert(error.response?.data?.message || 'Login failed. Please try again.');
//         navigate('/'); // fallback to home or login page
//       } finally {
//         setLoading(false);
//       }
//     };

//     autoLogin();
//   }, [email, password, navigate]);

//   if (loading) {
//     return (
//       <div className="loader-container">
//         <div className="loader"></div>
//         <p style={{ marginTop: '20px', fontSize: '18px', color: '#4f46e5' }}>
//           Signing you in...
//         </p>
//       </div>
//     );
//   }

//   return null; // no form, because login happens automatically
// };

// export default Login;


// import React, { useEffect, useState } from 'react';
// import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
// import { authAPI } from '../services/api';
// import './Login.css';

// const Login = () => {
//   const navigate = useNavigate();
//    const { accesstoken } = useParams();
//   const [searchParams] = useSearchParams(); 
//  // 👈 login token from URL
//   const cid = searchParams.get('cid');     // optional campaign/clinic id
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const autoLogin = async () => {
//       if (!accesstoken) {
//         alert('Token missing');
//         navigate('/');
//         return;
//       }

//       try {
//         const response = await authAPI.loginWithToken({ accesstoken }); // 👈 use new API

//         if (response.data.success) {
//           // Store token and doctor info
//           localStorage.setItem('doctorToken', response.data.data.token);
//           localStorage.setItem('doctorInfo', JSON.stringify(response.data.data.doctor));

//           // Navigate after success
//           navigate(`/doctor-dashboard${cid ? `?cid=${cid}` : ''}`);
//         } else {
//           alert(response.data.message || 'Login failed');
//           // navigate('/');
//         }
//       } catch (error) {
//         console.error('Login error:', error);
//         alert(error.response?.data?.message || 'Login failed. Please try again.');
//         // navigate('/');
//       } finally {
//         setLoading(false);
//       }
//     };

//     autoLogin();
//   }, [accesstoken, cid, navigate]);

//   if (loading) {
//     return (
//       <div className="loader-container">
//         <div className="loader"></div>
//         <p style={{ marginTop: '20px', fontSize: '18px', color: '#4f46e5' }}>
//           Signing you in...
//         </p>
//       </div>
//     );
//   }

//   return null; // no form, because login happens automatically
// };

// export default Login;





// import React, { useEffect, useState } from 'react';
// import { useSearchParams, useNavigate } from 'react-router-dom';
// import CryptoJS from 'crypto-js';
// import axios from 'axios';

// // Must match backend secret used for encryption
// const SECRET = 'super_secret_key_change_this';

// export default function AutoLoginEnc() {
//   const [searchParams] = useSearchParams();
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("Authenticating...");
//   const enc = searchParams.get('enc');

//   useEffect(() => {
//     const doAuto = async () => {
//       if (!enc) {
//         setMessage("Missing login token, redirecting...");
//         setTimeout(() => navigate('/login'), 2000);
//         return;
//       }

//       try {
//         // 🔐 Decrypt token
//         const decoded = decodeURIComponent(enc);
//         const bytes = CryptoJS.AES.decrypt(decoded, SECRET);
//         const decrypted = bytes.toString(CryptoJS.enc.Utf8);
//         if (!decrypted) throw new Error("Failed to decrypt login token");

//         const { loginToken } = JSON.parse(decrypted);

//         // 🌐 Call new API
//         const resp = await axios.post('/auth/login-with-token', { token: loginToken });

//         if (resp.data.success) {
//           localStorage.setItem('doctorToken', resp.data.data.token);
//           setMessage("Login successful! Redirecting...");
//           setTimeout(() => navigate('/doctor-dashboard'), 1500);
//         } else {
//           setMessage("Login failed, redirecting...");
//           setTimeout(() => navigate('/login'), 2000);
//         }

//       } catch (err) {
//         console.error(err);
//         setMessage("Invalid or expired login link, redirecting...");
//         setTimeout(() => navigate('/login'), 2000);
//       } finally {
//         setLoading(false);
//       }
//     };

//     doAuto();
//   }, [enc, navigate]);

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
//       <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center w-96 animate-fadeIn">
//         {loading ? (
//           <div className="flex flex-col items-center">
//             <div className="loader mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
//             <p className="text-gray-700 font-medium">{message}</p>
//           </div>
//         ) : (
//           <p className="text-gray-700 font-medium">{message}</p>
//         )}
//       </div>
//     </div>
//   );
// }


// import React, { useEffect, useState } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';

// export default function AutoLogin() {
//   const { token } = useParams();  // ← token comes from /auto-login/:token
//   const navigate = useNavigate();
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("Authenticating...");

//   useEffect(() => {
//     const doAuto = async () => {
//       if (!token) {
//         setMessage("Missing login token, redirecting...");
//         setTimeout(() => navigate('/login'), 2000);
//         return;
//       }

//       try {
//         const resp = await axios.post('/auth/login-with-token', { token });


//         console.log(resp);

//         if (resp.data.success) {
//           // localStorage.setItem('doctorToken', resp.data.data.token);


//           localStorage.setItem('doctorToken', response.data.data.token);
//           localStorage.setItem('doctorInfo', JSON.stringify(response.data.data.doctor));




//           setMessage("Login successful! Redirecting...");
//           setTimeout(() => navigate('/doctor-dashboard'), 1500);
//         } else {
//           setMessage("Login failed, redirecting...");
//           // setTimeout(() => navigate('/login'), 2000);
//         }
//       } catch (err) {
//         console.error(err);
//         setMessage("Invalid or expired login link, redirecting...");
//         // setTimeout(() => navigate('/login'), 2000);
//       } finally {
//         setLoading(false);
//       }
//     };

//     doAuto();
//   }, [token, navigate]);

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
//       <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center w-96 animate-fadeIn">
//         {loading ? (
//           <div className="flex flex-col items-center">
//             <div className="loader mb-4 border-4 border-indigo-600 border-t-transparent rounded-full w-12 h-12 animate-spin"></div>
//             <p className="text-gray-700 font-medium">{message}</p>
//           </div>
//         ) : (
//           <p className="text-gray-700 font-medium">{message}</p>
//         )}
//       </div>
//     </div>
//   );
// }


