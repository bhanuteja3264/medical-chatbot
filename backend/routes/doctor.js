const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chat = require('../models/Chat');
const Upload = require('../models/Upload');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/doctor/patient/:patientId
// @desc    Get patient information by patient ID
// @access  Private (Doctor)
router.get('/patient/:patientId', protect, authorize('doctor'), async (req, res) => {
  try {
    const patient = await User.findOne({ 
      patientId: req.params.patientId,
      role: 'patient'
    }).select('-password -verificationToken -resetPasswordToken');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.json({
      success: true,
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        medicalHistory: patient.medicalHistory,
        createdAt: patient.createdAt
      }
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient information',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/patient/:patientId/chats
// @desc    Get all chat sessions for a patient
// @access  Private (Doctor)
router.get('/patient/:patientId/chats', protect, authorize('doctor'), async (req, res) => {
  try {
    // First find the patient by patientId
    const patient = await User.findOne({ 
      patientId: req.params.patientId,
      role: 'patient'
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get all chats for this patient
    const chats = await Chat.find({ patientId: patient._id })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      patientInfo: {
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email
      },
      chats: chats.map(chat => ({
        sessionId: chat.sessionId,
        messageCount: chat.messages.length,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        status: chat.status,
        summary: chat.summary,
        tags: chat.tags
      }))
    });
  } catch (error) {
    console.error('Error fetching patient chats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient chat history',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/patient/:patientId/uploads
// @desc    Get all uploads for a patient
// @access  Private (Doctor)
router.get('/patient/:patientId/uploads', protect, authorize('doctor'), async (req, res) => {
  try {
    // First find the patient by patientId
    const patient = await User.findOne({ 
      patientId: req.params.patientId,
      role: 'patient'
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get all uploads for this patient
    const uploads = await Upload.find({ patientId: patient._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      patientInfo: {
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email
      },
      uploads: uploads.map(upload => ({
        id: upload._id,
        fileName: upload.originalName,
        fileType: upload.fileType,
        category: upload.category,
        fileUrl: upload.fileUrl,
        fileSize: upload.fileSize,
        extractedText: upload.extractedText,
        aiAnalysis: upload.aiAnalysis,
        sessionId: upload.sessionId,
        createdAt: upload.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching patient uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching patient uploads',
      error: error.message
    });
  }
});

// @route   POST /api/doctor/patient/:patientId/chat
// @desc    Doctor can chat with AI using patient's context
// @access  Private (Doctor)
router.post('/patient/:patientId/chat', protect, authorize('doctor'), async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    // Find the patient
    const patient = await User.findOne({ 
      patientId: req.params.patientId,
      role: 'patient'
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Get patient's chat context if sessionId provided
    let context = '';
    if (sessionId) {
      const chat = await Chat.findOne({ sessionId, patientId: patient._id });
      if (chat) {
        context = chat.messages.map(m => `${m.sender}: ${m.content}`).join('\n');
      }
    }

    // Process with AI (doctor asking about patient)
    const { processWithAI } = require('../utils/aiService');
    const aiResponse = await processWithAI({
      message: `Doctor inquiry about patient ${patient.name} (${req.params.patientId}): ${message}`,
      messageType: 'text',
      context: context
    });

    res.json({
      success: true,
      response: aiResponse.content || aiResponse,
      patientId: req.params.patientId
    });
  } catch (error) {
    console.error('Error in doctor chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing doctor inquiry',
      error: error.message
    });
  }
});

// @route   GET /api/doctor/search-patients
// @desc    Search for patients
// @access  Private (Doctor)
router.get('/search-patients', protect, authorize('doctor'), async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Search by patient ID, name, or email
    const patients = await User.find({
      role: 'patient',
      $or: [
        { patientId: new RegExp(query, 'i') },
        { name: new RegExp(query, 'i') },
        { email: new RegExp(query, 'i') }
      ]
    })
    .select('patientId name email phone createdAt')
    .limit(20);

    res.json({
      success: true,
      patients
    });
  } catch (error) {
    console.error('Error searching patients:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching patients',
      error: error.message
    });
  }
});

module.exports = router;
