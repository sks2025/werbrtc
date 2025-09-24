const express = require('express');
const jwt = require('jsonwebtoken');
const { Admin } = require('../models');
const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-admin-key-2024';

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    console.log('Admin login attempt:', { email });

    // Find admin by email
    const admin = await Admin.findOne({ 
      where: { 
        email: email.toLowerCase(),
        isActive: true 
      } 
    });

    if (!admin) {
      console.log('Admin not found:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await admin.checkPassword(password);
    if (!isPasswordValid) {
      console.log('Invalid password for admin:', email);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await admin.update({ lastLogin: new Date() });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: admin.id, 
        email: admin.email, 
        role: admin.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Admin login successful:', email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          lastLogin: admin.lastLogin
        },
        token: token,
        expiresIn: '24h'
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Verify Admin Token (Middleware)
const verifyAdminToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

// Get Admin Profile (Protected Route)
router.get('/profile', verifyAdminToken, async (req, res) => {
  try {
    const admin = await Admin.findByPk(req.admin.id, {
      attributes: ['id', 'email', 'name', 'role', 'lastLogin', 'createdAt']
    });

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin
    });

  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin Dashboard Stats (Protected Route)
router.get('/dashboard', verifyAdminToken, async (req, res) => {
  try {
    const { Doctor, Patient, Room, Consultation, CapturedImage, DigitalSignature } = require('../models');
    
    // Get counts of all major entities
    const [
      totalDoctors,
      totalPatients,
      totalRooms,
      totalConsultations,
      totalImages,
      totalSignatures,
      activeDoctors,
      activeRooms
    ] = await Promise.all([
      Doctor.count(),
      Patient.count(),
      Room.count(),
      Consultation.count(),
      CapturedImage.count(),
      DigitalSignature.count(),
      Doctor.count({ where: { isActive: true } }),
      Room.count({ where: { isActive: true } })
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await Promise.all([
      Room.count({ 
        where: { 
          createdAt: { 
            [require('sequelize').Op.gte]: sevenDaysAgo 
          } 
        } 
      }),
      Consultation.count({ 
        where: { 
          createdAt: { 
            [require('sequelize').Op.gte]: sevenDaysAgo 
          } 
        } 
      })
    ]);

    const dashboardStats = {
      overview: {
        totalDoctors,
        totalPatients,
        totalRooms,
        totalConsultations,
        totalImages,
        totalSignatures
      },
      active: {
        activeDoctors,
        activeRooms
      },
      recentActivity: {
        newRoomsThisWeek: recentActivity[0],
        newConsultationsThisWeek: recentActivity[1]
      },
      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: dashboardStats,
      message: 'Dashboard stats retrieved successfully'
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard stats',
      details: error.message
    });
  }
});

// Admin Logout (just for frontend, JWT is stateless)
router.post('/logout', verifyAdminToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
});

// Test Admin Endpoint (for testing)
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Admin routes are working',
    timestamp: new Date().toISOString()
  });
});

// Create New Admin (Protected Route - Only existing admins can create new ones)
router.post('/create-admin', verifyAdminToken, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if admin with email already exists
    const existingAdmin = await Admin.findOne({ 
      where: { email: email.toLowerCase() } 
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        error: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const newAdmin = await Admin.create({
      email: email.toLowerCase(),
      password,
      name: name || 'System Admin',
      role: role || 'admin'
    });

    // Remove password from response
    const adminResponse = {
      id: newAdmin.id,
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      isActive: newAdmin.isActive,
      createdAt: newAdmin.createdAt
    };

    console.log('New admin created by:', req.admin.email, '- New admin:', newAdmin.email);

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: adminResponse
    });

  } catch (error) {
    console.error('Create admin error:', error);
    
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors.map(err => err.message)
      });
    }

    // Handle Sequelize unique constraint errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({
        success: false,
        error: 'Admin with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Get All Admins (Protected Route)
router.get('/admins', verifyAdminToken, async (req, res) => {
  try {
    const admins = await Admin.findAll({
      attributes: ['id', 'email', 'name', 'role', 'isActive', 'lastLogin', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      message: 'Admins retrieved successfully',
      data: admins,
      count: admins.length
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Update Admin Status (Protected Route)
router.patch('/admin/:adminId/status', verifyAdminToken, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { isActive } = req.body;

    // Validate input
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isActive must be a boolean value'
      });
    }

    // Prevent self-deactivation
    if (req.admin.id == adminId && !isActive) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    // Find and update admin
    const admin = await Admin.findByPk(adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    await admin.update({ isActive });

    console.log('Admin status updated by:', req.admin.email, '- Target admin:', admin.email, '- New status:', isActive);

    res.status(200).json({
      success: true,
      message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: admin.id,
        email: admin.email,
        isActive: admin.isActive
      }
    });

  } catch (error) {
    console.error('Update admin status error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Delete Admin (Protected Route)
router.delete('/admin/:adminId', verifyAdminToken, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Prevent self-deletion
    if (req.admin.id == adminId) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    // Find admin
    const admin = await Admin.findByPk(adminId);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Check if this is the last active admin
    const activeAdminCount = await Admin.count({ where: { isActive: true } });
    if (activeAdminCount <= 1 && admin.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the last active admin'
      });
    }

    const deletedAdminEmail = admin.email;
    await admin.destroy();

    console.log('Admin deleted by:', req.admin.email, '- Deleted admin:', deletedAdminEmail);

    res.status(200).json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

module.exports = { router, verifyAdminToken };
