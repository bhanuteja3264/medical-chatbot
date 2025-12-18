const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password not required for Google OAuth
    }
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'doctor'],
    required: true
  },
  phone: {
    type: String,
    sparse: true
  },
  googleId: {
    type: String,
    sparse: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  // Doctor specific fields
  specialization: {
    type: String
  },
  licenseNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  doctorConsent: {
    type: Boolean,
    default: false
  },
  doctorConsentDate: {
    type: Date
  },
  // Patient specific fields
  patientId: {
    type: String,
    unique: true,
    sparse: true
  },
  abhaId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '']
  },
  dataConsent: {
    type: Boolean,
    default: false
  },
  consentDate: {
    type: Date
  },
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    notes: String
  }]
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Generate patient ID for patients and set consent dates
userSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Handle patient-specific setup
    if (this.role === 'patient') {
      if (!this.patientId) {
        const count = await mongoose.models.User.countDocuments({ role: 'patient' });
        this.patientId = `PT${String(count + 1).padStart(6, '0')}`;
      }
      if (this.dataConsent && !this.consentDate) {
        this.consentDate = new Date();
      }
    }
    // Handle doctor-specific setup
    if (this.role === 'doctor') {
      if (this.doctorConsent && !this.doctorConsentDate) {
        this.doctorConsentDate = new Date();
      }
    }
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
