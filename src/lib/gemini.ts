import { GoogleGenerativeAI } from '@google/generative-ai';

// 1. Get the API Key safely
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing Gemini API Key. Check your .env.local file.');
}

// 2. Initialize the client
// We export 'genAI' so other files can import it
export const genAI = new GoogleGenerativeAI(apiKey);

// 3. (Optional) Export a pre-configured model if you want a shared instance
// This fixes your specific error by defining the model after the client exists
export const model = genAI.getGenerativeModel({ 
  model: 'gemini-3-flash-preview',
  generationConfig: {
    temperature: 0.2
  }
});