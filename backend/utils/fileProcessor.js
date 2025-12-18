const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { processTextWithAI, processImageWithAI, processAudioWithAI, processVideoWithAI } = require('./aiService');

// Process PDF files
async function processPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    return {
      extractedText: data.text,
      numPages: data.numpages,
      info: data.info
    };
  } catch (error) {
    console.error('PDF processing error:', error);
    throw new Error('Failed to process PDF file');
  }
}

// Process Word documents
async function processWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    
    return {
      extractedText: result.value,
      messages: result.messages
    };
  } catch (error) {
    console.error('Word processing error:', error);
    throw new Error('Failed to process Word document');
  }
}

// Process text files
async function processTextFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    
    return {
      extractedText: text
    };
  } catch (error) {
    console.error('Text file processing error:', error);
    throw new Error('Failed to process text file');
  }
}

// Main file processor
async function processFile(filePath, mimeType, category) {
  try {
    let result = {
      extractedText: null,
      aiAnalysis: null,
      metadata: {}
    };

    // Process based on file category
    if (category === 'document') {
      if (mimeType === 'application/pdf') {
        const pdfData = await processPDF(filePath);
        result.extractedText = pdfData.extractedText;
        result.metadata = {
          numPages: pdfData.numPages?.toString(),
          ...pdfData.info
        };
      } else if (mimeType.includes('word') || mimeType.includes('document')) {
        const wordData = await processWord(filePath);
        result.extractedText = wordData.extractedText;
      } else if (mimeType === 'text/plain') {
        const textData = await processTextFile(filePath);
        result.extractedText = textData.extractedText;
      }

      // Get AI analysis of the document
      if (result.extractedText && result.extractedText.length > 0) {
        try {
          const aiResponse = await processTextWithAI(
            `Analyze this medical document and provide a brief summary:\n\n${result.extractedText.substring(0, 2000)}`
          );
          result.aiAnalysis = aiResponse.content;
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
        }
      }
    } else if (category === 'image') {
      try {
        const imageResponse = await processImageWithAI(filePath);
        result.aiAnalysis = imageResponse.content || 'Image received and processed';
        result.extractedText = imageResponse.content;
      } catch (aiError) {
        console.error('Image analysis error:', aiError);
      }
    } else if (category === 'audio') {
      try {
        const audioResponse = await processAudioWithAI(filePath);
        result.extractedText = audioResponse.transcription || 'Audio received';
        result.aiAnalysis = audioResponse.content;
      } catch (aiError) {
        console.error('Audio analysis error:', aiError);
      }
    } else if (category === 'video') {
      try {
        const videoResponse = await processVideoWithAI(filePath);
        result.extractedText = 'Video processed';
        result.aiAnalysis = videoResponse.content;
      } catch (aiError) {
        console.error('Video analysis error:', aiError);
      }
    }

    return result;
  } catch (error) {
    console.error('File processing error:', error);
    return {
      extractedText: null,
      aiAnalysis: 'File uploaded successfully but could not be analyzed automatically.',
      metadata: {}
    };
  }
}

module.exports = {
  processFile,
  processPDF,
  processWord,
  processTextFile
};
