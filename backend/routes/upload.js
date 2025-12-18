const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const Upload = require('../models/Upload');
const { protect, authorize } = require('../middleware/auth');
const { processFile } = require('../utils/fileProcessor');
const path = require('path');

// @route   POST /api/upload
// @desc    Upload multiple files (up to 5 files of any type: images, audio, video, documents)
// @access  Private (Patient)
router.post('/', protect, authorize('patient'), upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    const uploadedFiles = [];

    // Process each file
    for (const file of req.files) {
      // Determine file category
      let category = 'other';
      if (file.mimetype.startsWith('image/')) {
        category = 'image';
      } else if (file.mimetype.startsWith('audio/')) {
        category = 'audio';
      } else if (file.mimetype.startsWith('video/')) {
        category = 'video';
      } else if (
        file.mimetype === 'application/pdf' ||
        file.mimetype.includes('document') ||
        file.mimetype === 'text/plain'
      ) {
        category = 'document';
      }

      // File URL
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

      // Create upload record
      const uploadRecord = await Upload.create({
        patientId: req.user._id,
        sessionId,
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        fileUrl,
        category,
        metadata: {}
      });

      // Process file to extract text/information
      try {
        const processedData = await processFile(file.path, file.mimetype, category);
        
        if (processedData.extractedText) {
          uploadRecord.extractedText = processedData.extractedText;
        }
        
        if (processedData.aiAnalysis) {
          uploadRecord.aiAnalysis = processedData.aiAnalysis;
        }
        
        await uploadRecord.save();
      } catch (processError) {
        console.error('Error processing file:', processError);
        // Continue even if processing fails
      }

      uploadedFiles.push({
        id: uploadRecord._id,
        fileName: uploadRecord.originalName,
        fileUrl: uploadRecord.fileUrl,
        fileType: uploadRecord.fileType,
        category: uploadRecord.category,
        extractedText: uploadRecord.extractedText,
        aiAnalysis: uploadRecord.aiAnalysis
      });
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading files',
      error: error.message
    });
  }
});

// @route   GET /api/upload/session/:sessionId
// @desc    Get all uploads for a session
// @access  Private (Patient)
router.get('/session/:sessionId', protect, authorize('patient'), async (req, res) => {
  try {
    const uploads = await Upload.find({
      sessionId: req.params.sessionId,
      patientId: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      uploads: uploads.map(upload => ({
        id: upload._id,
        fileName: upload.originalName,
        fileUrl: upload.fileUrl,
        fileType: upload.fileType,
        category: upload.category,
        extractedText: upload.extractedText,
        aiAnalysis: upload.aiAnalysis,
        createdAt: upload.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching uploads',
      error: error.message
    });
  }
});

// @route   DELETE /api/upload/:id
// @desc    Delete an upload
// @access  Private (Patient)
router.delete('/:id', protect, authorize('patient'), async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      patientId: req.user._id
    });

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    // Delete file from filesystem
    const fs = require('fs');
    if (fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    await upload.deleteOne();

    res.json({
      success: true,
      message: 'Upload deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting upload',
      error: error.message
    });
  }
});

module.exports = router;
