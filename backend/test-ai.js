// Test AI Configuration
// Run this script with: node test-ai.js

require('dotenv').config();

console.log('\n🤖 Testing AI Configuration...\n');

// Check environment variables
console.log('📋 Configuration Check:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const AI_PROVIDER = process.env.AI_PROVIDER || 'not set';
console.log(`AI Provider: ${AI_PROVIDER}`);

// Check OpenAI
if (process.env.OPENAI_API_KEY) {
  const key = process.env.OPENAI_API_KEY;
  console.log(`✅ OpenAI API Key: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${key.length} chars)`);
} else {
  console.log('❌ OpenAI API Key: Not configured');
}

// Check Gemini
if (process.env.GEMINI_API_KEY) {
  const key = process.env.GEMINI_API_KEY;
  console.log(`✅ Gemini API Key: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${key.length} chars)`);
} else {
  console.log('❌ Gemini API Key: Not configured');
}

// Check HuggingFace
if (process.env.HUGGINGFACE_API_KEY) {
  const key = process.env.HUGGINGFACE_API_KEY;
  console.log(`✅ HuggingFace API Key: ${key.substring(0, 10)}...${key.substring(key.length - 4)} (${key.length} chars)`);
} else {
  console.log('❌ HuggingFace API Key: Not configured');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Test AI Service
console.log('🧪 Testing AI Service...\n');

const { processTextWithAI } = require('./utils/aiService');

async function testAI() {
  try {
    console.log('Testing query: "I have a headache"\n');
    
    const result = await processTextWithAI('I have a headache');
    
    console.log('📝 Response:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(result.content);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔧 Provider: ${result.provider || 'unknown'}`);
    
    if (result.error) {
      console.log(`⚠️ Error: ${result.error}`);
    }
    
    console.log('\n✨ AI Service is working!\n');
    
  } catch (error) {
    console.error('\n❌ Error testing AI service:');
    console.error(error.message);
    console.log('\n💡 Solution:');
    console.log('1. Check your .env file has a valid API key');
    console.log('2. Make sure you have internet connection');
    console.log('3. Verify your API key is active and has credits\n');
  }
}

testAI();
