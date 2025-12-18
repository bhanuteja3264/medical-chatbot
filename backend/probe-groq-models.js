const Groq = require('groq-sdk');
require('dotenv').config({ path: '../.env' });

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

async function listGroqModels() {
  try {
    console.log('🔍 Fetching available Groq models...\n');
    
    const models = await groq.models.list();
    
    console.log('📋 Available Groq Models:\n');
    console.log('='.repeat(80));
    
    for await (const model of models) {
      console.log(`\nModel ID: ${model.id}`);
      console.log(`  - Active: ${model.active}`);
      console.log(`  - Context Window: ${model.context_window}`);
      console.log(`  - Created: ${new Date(model.created * 1000).toISOString()}`);
      if (model.owned_by) console.log(`  - Owned by: ${model.owned_by}`);
      console.log('-'.repeat(80));
    }
    
  } catch (error) {
    console.error('❌ Error listing Groq models:', error.message);
    console.error(error);
  }
}

listGroqModels();
