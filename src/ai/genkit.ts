import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Get API key from environment variables (Genkit GoogleAI plugin looks for these)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  console.warn('Warning: Gemini API key not found. Please set GEMINI_API_KEY, GOOGLE_GENAI_API_KEY, or GOOGLE_AI_API_KEY in your environment variables.');
}

// Configure Genkit with Google AI plugin
// The plugin automatically reads from environment variables, but we can also pass config
export const ai = genkit({
  plugins: [
    googleAI(apiKey ? {
      apiKey: apiKey,
    } : undefined),
  ],
  model: 'googleai/gemini-2.0-flash',
});
