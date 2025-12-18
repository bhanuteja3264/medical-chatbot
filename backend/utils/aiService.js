const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Initialize Groq with API key from environment
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Groq Vision Model (Llama 4 Scout)
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
// Groq Text Model (Llama 3.3 70B)
const TEXT_MODEL = 'llama-3.3-70b-versatile';
// Groq Whisper Model for transcription
const WHISPER_MODEL = 'whisper-large-v3-turbo';

// Generate SHAP-inspired explanation for AI response
async function generateExplanation(userQuestion, aiResponse, context = '') {
  try {
    const explanationPrompt = `Analyze this medical AI interaction and provide a clear, specific explanation of WHY this particular response was generated.

USER QUESTION: "${userQuestion}"

AI RESPONSE: "${aiResponse}"

${context ? `CONVERSATION CONTEXT: ${context}` : ''}

Provide a dynamic, unique explanation that covers:
1. Key medical concepts or symptoms identified in the question
2. Why specific advice or information was prioritized in the response
3. What factors influenced the tone and depth of the answer
4. How context or medical best practices shaped the guidance

Be specific to THIS interaction - avoid generic templates. Make it educational and insightful.`;

    const response = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an AI explainability expert. Provide clear, specific explanations of WHY an AI gave a particular response. Focus on the unique aspects of each interaction. Be concise but insightful.'
        },
        {
          role: 'user',
          content: explanationPrompt
        }
      ],
      temperature: 0.6,
      max_tokens: 400,
      top_p: 0.9
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('❌ Explanation generation error:', error.message);
    return 'Explanation temporarily unavailable.';
  }
}

// Process text with Groq AI (Llama 3.3 70B)
async function processTextWithAI(text, context = '') {
  try {
    console.log('📝 Processing with Groq AI:', text.substring(0, 50) + '...');
    
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful, empathetic medical assistant. Provide accurate medical information and advice in a caring, professional manner. Keep responses concise, practical, and easy to understand. Always remind users to consult healthcare professionals for serious concerns or emergencies. Be warm and supportive.'
      }
    ];

    if (context) {
      messages.push({
        role: 'assistant',
        content: context
      });
    }

    messages.push({
      role: 'user',
      content: text
    });

    const response = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1
    });

    const aiResponse = response.choices[0].message.content;
    console.log('✅ Groq AI responded successfully');
    
    // Generate dynamic explanation for this specific response
    console.log('🔍 Generating SHAP-inspired explanation...');
    const explanation = await generateExplanation(text, aiResponse, context);
    console.log('✅ Explanation generated');
    
    return {
      content: aiResponse,
      explanation: explanation,
      success: true,
      provider: 'groq-llama-3.3-70b'
    };
  } catch (error) {
    console.error('❌ Groq API error:', error.message);
    return {
      content: "I apologize, but I'm having trouble connecting to my AI service right now. Please try again in a moment. If this persists, please contact support.",
      success: false,
      error: error.message,
      provider: 'error'
    };
  }
}

// Process image with AI (using Groq Vision - Llama 4 Scout)
async function processImageWithAI(imagePath, userMessage = '') {
  try {
    console.log('📷 Processing image with Groq Vision:', imagePath);
    
    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    // Get image mime type
    const ext = path.extname(imagePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    const mimeType = mimeTypes[ext] || 'image/jpeg';
    
    const prompt = userMessage 
      ? `The user shared an image and says: "${userMessage}". Please analyze this medical image and provide relevant medical insights, observations, and recommendations. Be specific about what you see.`
      : 'Please analyze this medical image in detail. Describe what you observe, any visible symptoms, conditions, or concerns. Provide medical insights and recommendations. Be professional and thorough.';
    
    // Use Groq Vision API (Llama 4 Scout)
    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1
    });
    
    const analysis = completion.choices[0].message.content;
    
    console.log('✅ Image analysis completed with Groq Vision');
    
    // Generate explanation for the image analysis
    const explanation = await generateExplanation(
      userMessage || 'Image analysis request',
      analysis,
      'Visual medical image analysis'
    );
    
    return {
      content: analysis,
      explanation: explanation,
      success: true,
      provider: 'groq-vision-llama4-scout'
    };
  } catch (error) {
    console.error('❌ Image processing error:', error.message);
    return {
      content: "📷 I can see you've shared an image. While I'm experiencing technical difficulties with detailed image analysis, please describe what you're seeing or any concerns you have, and I'll provide medical guidance.",
      success: false,
      error: error.message,
      provider: 'fallback'
    };
  }
}

// Extract audio from video or process audio file
async function extractAudioFromVideo(videoPath) {
  return new Promise((resolve, reject) => {
    const outputPath = videoPath.replace(/\.[^/.]+$/, '.mp3');
    
    ffmpeg(videoPath)
      .toFormat('mp3')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// Process document files (PDF, Word, Text)
async function processDocumentWithAI(filePath, userMessage = '') {
  try {
    console.log('📄 Processing document with Groq AI:', filePath);
    
    let extractedText = '';
    const ext = path.extname(filePath).toLowerCase();
    
    // Extract text based on file type
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
      console.log(`✅ Extracted ${extractedText.length} characters from PDF (${pdfData.numpages} pages)`);
    } else if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: filePath });
      extractedText = result.value;
      console.log(`✅ Extracted ${extractedText.length} characters from Word document`);
    } else if (ext === '.txt') {
      extractedText = fs.readFileSync(filePath, 'utf8');
      console.log(`✅ Extracted ${extractedText.length} characters from text file`);
    } else {
      throw new Error(`Unsupported document type: ${ext}`);
    }
    
    // Truncate if too long (keep first 4000 chars for context)
    const truncatedText = extractedText.substring(0, 4000);
    
    // Create prompt for AI analysis
    let prompt = '';
    if (userMessage && userMessage.trim()) {
      prompt = `The user uploaded a medical document and asks: "${userMessage}"\n\nDocument content:\n${truncatedText}\n\nPlease analyze the document and answer their question. Provide relevant medical insights and recommendations.`;
    } else {
      prompt = `Please analyze this medical document and provide a comprehensive summary, highlighting key medical information, diagnoses, treatments, test results, medications, and any important observations or recommendations.\n\nDocument content:\n${truncatedText}`;
    }
    
    // Process with Groq AI
    const aiResponse = await processTextWithAI(prompt);
    
    return {
      content: `**Document Analysis:**\n\n${aiResponse.content}\n\n---\n*Document length: ${extractedText.length} characters*`,
      extractedText: extractedText,
      explanation: aiResponse.explanation,
      success: true,
      provider: 'groq-document-analysis'
    };
  } catch (error) {
    console.error('❌ Document processing error:', error.message);
    return {
      content: "📄 I've received your document but I'm having trouble reading it. Please try uploading it again or describe its contents, and I'll help you analyze it.",
      success: false,
      error: error.message,
      provider: 'fallback'
    };
  }
}

// Process audio with AI (using Groq Whisper for transcription)
async function processAudioWithAI(audioPath, userMessage = '') {
  try {
    console.log('🎤 Processing audio with Groq Whisper:', audioPath);
    
    // Read audio file
    const audioFile = fs.createReadStream(audioPath);
    
    // Transcribe audio using Groq Whisper
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: WHISPER_MODEL,
      response_format: 'json',
      language: 'en'
    });
    
    const transcribedText = transcription.text;
    console.log('✅ Audio transcribed:', transcribedText.substring(0, 100) + '...');
    
    // Process the transcribed text with AI
    const contextMessage = userMessage 
      ? `User's audio message (transcribed): "${transcribedText}". Additional context: ${userMessage}`
      : `User's audio message (transcribed): "${transcribedText}"`;
    
    const aiResponse = await processTextWithAI(contextMessage);
    
    return {
      content: `**Transcription:** ${transcribedText}\n\n**Response:** ${aiResponse.content}`,
      transcription: transcribedText,
      explanation: aiResponse.explanation,
      success: true,
      provider: 'groq-whisper-turbo'
    };
  } catch (error) {
    console.error('❌ Audio processing error:', error.message);
    return {
      content: "🎤 I've received your audio message but I'm having trouble processing it right now. Please try typing your message, or try again in a moment.",
      success: false,
      error: error.message,
      provider: 'fallback'
    };
  }
}

// Process video with AI (extract frames and audio)
async function processVideoWithAI(videoPath, userMessage = '') {
  try {
    console.log('🎥 Processing video:', videoPath);
    
    // Extract first frame as thumbnail
    const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg');
    
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01'],
          filename: path.basename(thumbnailPath),
          folder: path.dirname(thumbnailPath),
          size: '640x480'
        })
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Analyze the thumbnail
    const imageAnalysis = await processImageWithAI(thumbnailPath, 'This is a frame from a video');
    
    // Try to extract and transcribe audio
    let audioAnalysis = null;
    try {
      const audioPath = await extractAudioFromVideo(videoPath);
      audioAnalysis = await processAudioWithAI(audioPath, '');
      
      // Clean up extracted audio
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    } catch (audioError) {
      console.log('No audio track or audio extraction failed');
    }
    
    // Combine analyses
    let combinedResponse = `**Video Analysis:**\n\n`;
    combinedResponse += `**Visual Content:** ${imageAnalysis.content}\n\n`;
    
    if (audioAnalysis && audioAnalysis.transcription) {
      combinedResponse += `**Audio Transcription:** ${audioAnalysis.transcription}\n\n`;
    }
    
    if (userMessage) {
      const contextResponse = await processTextWithAI(
        `Regarding this video: ${userMessage}. Video context: ${imageAnalysis.content}`
      );
      combinedResponse += `**Response:** ${contextResponse.content}`;
    }
    
    // Clean up thumbnail
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }
    
    console.log('✅ Video processing completed');
    
    return {
      content: combinedResponse,
      success: true,
      provider: 'groq-vision-scout+whisper'
    };
  } catch (error) {
    console.error('❌ Video processing error:', error.message);
    return {
      content: "🎥 I've received your video. Please describe what you'd like me to know about it, and I'll provide medical guidance.",
      success: false,
      error: error.message,
      provider: 'fallback'
    };
  }
}

// Main AI processing function
async function processWithAI({ message, messageType = 'text', fileUrl, filePath, conversationHistory = [] }) {
  try {
    console.log('🤖 Processing AI request - Type:', messageType, 'Message:', message?.substring(0, 50));
    
    // Build context from conversation history
    let context = '';
    if (conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-3);
      context = recentMessages
        .map(msg => `${msg.sender === 'patient' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    }

    // Process based on message type
    if (messageType === 'text') {
      return await processTextWithAI(message, context);
    } 
    else if (messageType === 'image') {
      const imageResponse = await processImageWithAI(filePath, message);
      return imageResponse;
    } 
    else if (messageType === 'audio') {
      return await processAudioWithAI(filePath, message);
    } 
    else if (messageType === 'video') {
      return await processVideoWithAI(filePath, message);
    }
    else if (messageType === 'document') {
      // Process PDFs, Word docs, and text files
      if (filePath && fs.existsSync(filePath)) {
        return await processDocumentWithAI(filePath, message);
      } else {
        // Fallback if file path not found
        if (message && message.trim()) {
          return await processTextWithAI(`Regarding the document: ${message}`, context);
        }
        return {
          content: "📄 I've received your document. Please let me know what you'd like to discuss about it.",
          success: true,
          provider: 'basic'
        };
      }
    }

    return await processTextWithAI(message || 'Please provide some information.', context);
  } catch (error) {
    console.error('❌ AI processing error:', error);
    return {
      content: "I apologize, but I'm experiencing technical difficulties. Please try again shortly.",
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  processWithAI,
  processTextWithAI,
  processImageWithAI,
  processAudioWithAI,
  processVideoWithAI,
  processDocumentWithAI
};
