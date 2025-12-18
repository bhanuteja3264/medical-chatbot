const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['image', 'audio', 'document', 'other'],
    required: true
  },
  extractedText: String,
  aiAnalysis: String,
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
uploadSchema.index({ patientId: 1, createdAt: -1 });
uploadSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Upload', uploadSchema);
