'use server';

/**
 * RAG Chat Flow
 * 
 * This flow combines:
 * 1. Retrieved context from FAISS (diseases + patient records)
 * 2. User's question
 * 3. Conversation history
 * 
 * To generate a contextual, accurate response using Gemini.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatRAGInputSchema = z.object({
  userMessage: z.string().describe('The user\'s current question or message.'),
  diseasesContext: z.string().optional().describe('Relevant disease information retrieved from FAISS.'),
  patientRecordsContext: z.string().optional().describe('Relevant patient records retrieved from FAISS.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().describe('Previous messages in the conversation.'),
});

const ChatRAGOutputSchema = z.object({
  answer: z.string().describe('The AI assistant\'s response to the user.'),
  sources: z.array(z.string()).optional().describe('Sources or citations used in the response.'),
});

export type ChatRAGInput = z.infer<typeof ChatRAGInputSchema>;
export type ChatRAGOutput = z.infer<typeof ChatRAGOutputSchema>;

/**
 * Main RAG chat function
 */
export async function chatWithRAG(input: ChatRAGInput): Promise<ChatRAGOutput> {
  return chatRAGFlow(input);
}

/**
 * RAG Chat Prompt
 * 
 * This prompt instructs Gemini to:
 * - Use the retrieved context to answer questions
 * - Be medically accurate but not provide diagnoses
 * - Cite sources when available
 * - Maintain conversation context
 */
const ragChatPrompt = ai.definePrompt({
  name: 'ragChatPrompt',
  input: { schema: ChatRAGInputSchema },
  output: { schema: ChatRAGOutputSchema },
  prompt: `You are a helpful AI health assistant. Your role is to provide information and guidance based on:
1. A knowledge base of diseases, symptoms, and treatments
2. The user's personal health records (if available)
3. The conversation history

IMPORTANT MEDICAL DISCLAIMERS:
- You are NOT a licensed medical professional
- You CANNOT provide medical diagnoses
- You CANNOT prescribe medications
- Always recommend consulting with a healthcare professional for medical decisions
- For emergencies, advise immediate medical attention

INSTRUCTIONS:
- Use the provided context to answer questions accurately
- If the context contains relevant information, use it to provide detailed answers
- If the context doesn't contain relevant information, say so and provide general guidance
- Maintain a helpful, empathetic, and professional tone
- If asked about symptoms, provide information but emphasize the need for professional evaluation
- If asked about treatments, explain options but stress the importance of doctor consultation
- Reference specific diseases or records when relevant
- Keep responses clear and concise

RELEVANT DISEASE INFORMATION:
{{{diseasesContext}}}

RELEVANT PATIENT RECORDS:
{{{patientRecordsContext}}}

CONVERSATION HISTORY:
{{{conversationHistory}}}

USER'S CURRENT QUESTION:
{{{userMessage}}}

Provide a helpful, accurate response based on the context above. Include sources when referencing specific diseases or records.`,
});

/**
 * RAG Chat Flow
 */
const chatRAGFlow = ai.defineFlow(
  {
    name: 'chatRAGFlow',
    inputSchema: ChatRAGInputSchema,
    outputSchema: ChatRAGOutputSchema,
  },
  async (input) => {
    // Format conversation history as string
    const conversationHistoryText = input.conversationHistory
      ? input.conversationHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n')
      : 'No previous conversation.';

    // Format diseases context (default to empty if not provided)
    const diseasesContextText = input.diseasesContext || 'No relevant disease information found.';

    // Format patient records context (default to empty if not provided)
    const patientRecordsContextText = input.patientRecordsContext || 'No relevant patient records found.';

    // Prepare input for prompt
    const promptInput = {
      userMessage: input.userMessage,
      diseasesContext: diseasesContextText,
      patientRecordsContext: patientRecordsContextText,
      conversationHistory: conversationHistoryText,
    };

    // Generate response using the prompt
    const { output } = await ragChatPrompt(promptInput);
    
    // Extract sources from the context
    const sources: string[] = [];
    
    if (input.diseasesContext) {
      // Extract disease names from context
      const diseaseMatches = input.diseasesContext.match(/Disease \d+: ([^\n]+)/g);
      if (diseaseMatches) {
        diseaseMatches.forEach(match => {
          const diseaseName = match.replace(/Disease \d+: /, '');
          sources.push(`Disease Database: ${diseaseName}`);
        });
      }
    }
    
    if (input.patientRecordsContext) {
      sources.push('Your Health Records');
    }
    
    return {
      answer: output?.answer || 'I apologize, but I encountered an error generating a response. Please try again.',
      sources: sources.length > 0 ? sources : undefined,
    };
  }
);

