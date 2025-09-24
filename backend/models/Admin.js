const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'System Admin'
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'admin'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'isactive'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lastlogin' 
  }
}, {
  tableName: 'admins',
  timestamps: true,
  hooks: {
    beforeCreate: async (admin) => {
      if (admin.password) {
        admin.password = await bcrypt.hash(admin.password, 10);
      }
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, 10);
      }
    }
  }
});

// Instance method to check password
Admin.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Static method to create default admin
Admin.createDefaultAdmin = async function() {
  try {
    const existingAdmin = await Admin.findOne({ where: { email: 'admin@gmail.com' } });
    
    if (!existingAdmin) {
      await Admin.create({
        email: 'admin@gmail.com',
        password: 'Admin@123',
        name: 'System Administrator',
        role: 'admin'
      });
      console.log('✅ Default admin created: admin@gmail.com / Admin@123');
    } else {
      console.log('ℹ️  Default admin already exists');
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error.message);
  }
};

module.exports = Admin;
