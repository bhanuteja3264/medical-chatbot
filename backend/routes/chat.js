const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { protect, authorize } = require('../middleware/auth');
const { processWithAI } = require('../utils/aiService');
const { v4: uuidv4 } = require('uuid');

// @route   POST /api/chat/start
// @desc    Start a new chat session
// @access  Private (Patient)
router.post('/start', protect, authorize('patient'), async (req, res) => {
  try {
    const sessionId = uuidv4();

    const chat = await Chat.create({
      patientId: req.user._id,
      patientName: req.user.name,
      patientEmail: req.user.email,
      sessionId,
      messages: []
    });

    res.json({
      success: true,
      sessionId,
      chatId: chat._id
    });
  } catch (error) {
    console.error('Error starting chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting chat session',
      error: error.message
    });
  }
});

// @route   POST /api/chat/message
// @desc    Send a message to AI
// @access  Private (Patient)
router.post('/message', protect, authorize('patient'), async (req, res) => {
  try {
    const { sessionId, message, messageType = 'text', fileUrl, fileName, fileType } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and message are required'
      });
    }

    // Find or create chat session
    let chat = await Chat.findOne({ sessionId });

    if (!chat) {
      chat = await Chat.create({
        patientId: req.user._id,
        patientName: req.user.name,
        patientEmail: req.user.email,
        sessionId,
        messages: []
      });
    }

    // Add patient message
    const patientMessage = {
      sender: 'patient',
      content: message,
      messageType,
      fileUrl,
      fileName,
      fileType,
      timestamp: new Date()
    };

    chat.messages.push(patientMessage);

    // Get file path if there's a file attachment
    let filePath = null;
    if (fileUrl && messageType !== 'text') {
      const Upload = require('../models/Upload');
      const uploadRecord = await Upload.findOne({ fileUrl, patientId: req.user._id });
      if (uploadRecord) {
        filePath = uploadRecord.filePath;
      }
    }

    // Process with AI
    let aiResponse;
    try {
      aiResponse = await processWithAI({
        message,
        messageType,
        fileUrl,
        filePath, // Pass the actual file path
        conversationHistory: chat.messages.slice(-10) // Last 10 messages for context
      });
    } catch (aiError) {
      console.error('AI processing error:', aiError);
      aiResponse = {
        content: "I apologize, but I'm having trouble processing your request. Could you please try again or rephrase your question?",
        success: false
      };
    }

    // Add AI response
    const aiMessage = {
      sender: 'ai',
      content: aiResponse.content || aiResponse,
      explanation: aiResponse.explanation || null, // Add SHAP explanation
      messageType: 'text',
      timestamp: new Date()
    };

    chat.messages.push(aiMessage);
    await chat.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      aiResponse: aiMessage.content,
      explanation: aiMessage.explanation, // Send explanation to frontend
      messageId: aiMessage._id
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message',
      error: error.message
    });
  }
});

// @route   GET /api/chat/history/:sessionId
// @desc    Get chat history for a session
// @access  Private (Patient)
router.get('/history/:sessionId', protect, authorize('patient'), async (req, res) => {
  try {
    const chat = await Chat.findOne({
      sessionId: req.params.sessionId,
      patientId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    res.json({
      success: true,
      chat: {
        sessionId: chat.sessionId,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history',
      error: error.message
    });
  }
});

// @route   GET /api/chat/sessions
// @desc    Get all chat sessions for current patient
// @access  Private (Patient)
router.get('/sessions', protect, authorize('patient'), async (req, res) => {
  try {
    const chats = await Chat.find({ patientId: req.user._id })
      .sort({ updatedAt: -1 })
      .select('sessionId createdAt updatedAt messages status');

    const sessions = chats.map(chat => ({
      sessionId: chat.sessionId,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1],
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      status: chat.status
    }));

    res.json({
      success: true,
      sessions
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat sessions',
      error: error.message
    });
  }
});

// @route   DELETE /api/chat/session/:sessionId
// @desc    Delete a chat session
// @access  Private (Patient)
router.delete('/session/:sessionId', protect, authorize('patient'), async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      sessionId: req.params.sessionId,
      patientId: req.user._id
    });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat session not found'
      });
    }

    res.json({
      success: true,
      message: 'Chat session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting chat session',
      error: error.message
    });
  }
});

module.exports = router;
