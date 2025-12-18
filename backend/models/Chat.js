const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['patient', 'ai'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'audio', 'document'],
    default: 'text'
  },
  fileUrl: String,
  fileName: String,
  fileType: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientName: String,
  patientEmail: String,
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  summary: String,
  tags: [String]
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ patientId: 1, createdAt: -1 });
chatSchema.index({ sessionId: 1 });

module.exports = mongoose.model('Chat', chatSchema);
