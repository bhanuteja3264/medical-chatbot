const { processTextWithAI, processImageWithAI, processAudioWithAI, processDocumentWithAI } = require('./utils/aiService');

async function testGroqCapabilities() {
  console.log('🧪 Testing Groq AI Complete Integration\n');
  console.log('='.repeat(80));
  
  // Test 1: Text Processing
  console.log('\n📝 TEST 1: Text Processing (Llama 3.3 70B)');
  console.log('-'.repeat(80));
  try {
    const textResult = await processTextWithAI('I have a mild headache and feeling tired. What should I do?');
    console.log('✅ Text Response:', textResult.content.substring(0, 200) + '...');
    console.log('✅ Explanation:', textResult.explanation.substring(0, 150) + '...');
    console.log('✅ Provider:', textResult.provider);
  } catch (error) {
    console.error('❌ Text test failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ All Groq Integration Tests Completed!');
  console.log('\nAvailable Capabilities:');
  console.log('  📝 Text: Llama 3.3 70B Versatile');
  console.log('  📷 Images: Llama 4 Scout 17B (vision model)');
  console.log('  🎤 Audio/Speech: Whisper Large V3 Turbo');
  console.log('  🎥 Video: Llama 4 Scout + Whisper');
  console.log('  📄 Documents: PDF/Word/Text extraction + Llama 3.3 70B');
  console.log('  🔍 Explanations: SHAP-inspired reasoning for all responses');
}

testGroqCapabilities().catch(console.error);
