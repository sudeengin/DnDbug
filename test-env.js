// Test environment variable detection
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('🔍 Environment Variable Test:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY value:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0);

const useAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';
console.log('useAI:', useAI);

if (!useAI) {
  console.log('❌ OpenAI API key is required for the system to function');
  console.log('   Please set OPENAI_API_KEY in your .env.local file');
} else {
  console.log('✅ OpenAI API key is configured - system will use AI generation');
}
