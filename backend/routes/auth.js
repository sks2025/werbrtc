const express = require('express');
const jwt = require('jsonwebtoken');
const { Doctor } = require('../models');
const router = express.Router();

// Doctor Registration
router.post('/register', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      medicalLicense,
      specialization
    } = req.body;

    // Check if doctor already exists
    const existingDoctor = await Doctor.findOne({ where: { email } });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email already exists'
      });
    }

    // Check medical license
    const existingLicense = await Doctor.findOne({ where: { medicalLicense } });
    if (existingLicense) {
      return res.status(400).json({
        success: false,
        message: 'Medical license already registered'
      });
    }

    // Create new doctor
    const doctor = await Doctor.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      gender,
      medicalLicense,
      specialization
    });

    // Generate JWT token
    const token = jwt.sign(
      { doctorId: doctor.id, email: doctor.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: 'Doctor registered successfully',
      data: {
        doctor: {
          id: doctor.id,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          specialization: doctor.specialization
        },
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Registration failed'
    });
  }
});

// Doctor Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find doctor
    const doctor = await Doctor.findOne({ where: { email, isActive: true } });
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await doctor.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await doctor.update({ lastLogin: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { doctorId: doctor.id, email: doctor.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        doctor: {
          id: doctor.id,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          specialization: doctor.specialization,
          fullName: doctor.getFullName()
        },
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});


// router.post('/login-with-token', async (req, res) => {
//   try {
//     const { token } = req.body;

//     if (!token) {
//       return res.status(400).json({
//         success: false,
//         message: 'Token is required'
//       });
//     }

//     // Verify the login token
//     let payload;
//     try {
//       payload = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid or expired token'
//       });
//     }

//     // Expect payload to have doctorId or email
//     const doctor = await Doctor.findOne({
//       where: { id: payload.doctorId, isActive: true }
//     });

//     if (!doctor) {
//       return res.status(401).json({
//         success: false,
//         message: 'Doctor not found or inactive'
//       });
//     }

//     // Update last login
//     await doctor.update({ lastLogin: new Date() });

//     // Generate a new session JWT (like normal login)
//     const sessionToken = jwt.sign(
//       { doctorId: doctor.id, email: doctor.email },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         doctor: {
//           id: doctor.id,
//           firstName: doctor.firstName,
//           lastName: doctor.lastName,
//           email: doctor.email,
//           specialization: doctor.specialization,
//           fullName: doctor.getFullName()
//         },
//         token: sessionToken
//       }
//     });

//   } catch (error) {
//     console.error('Login-with-token error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Login with token failed'
//     });
//   }
// });



router.post('/login-with-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Check token in the Doctor table (assuming you store it there)
    const doctor = await Doctor.findOne({
      where: { loginToken: token, isActive: true }
    });

    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or doctor not found'
      });
    }

    // Update last login
    await doctor.update({ lastLogin: new Date() });

    // Generate new session token
    // const sessionToken = jwt.sign(
    //   { doctorId: doctor.id, email: doctor.email },
    //   process.env.JWT_SECRET,
    //   { expiresIn: '24h' }
    // );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        doctor: {
          id: doctor.id,
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          email: doctor.email,
          specialization: doctor.specialization,
          fullName: doctor.getFullName()
        },
        token: sessionToken
      }
    });

  } catch (error) {
    console.error('Login-with-token error:', error);
    res.status(500).json({
      success: false,
      message: 'Login with token failed'
    });
  }
});


// Get Doctor Profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctor = await Doctor.findByPk(decoded.doctorId, {
      attributes: { exclude: ['password'] }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: { doctor }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

module.exports = router;