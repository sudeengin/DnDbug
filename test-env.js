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
  console.log('✅ Should use mock data');
} else {
  console.log('❌ Should use AI');
}
