import { NextRequest, NextResponse } from 'next/server';
import { chatWithRAG } from '@/ai/flows/chat-rag';

const FAISS_SERVICE_URL = process.env.FAISS_SERVICE_URL || 'http://localhost:8000';

interface ChatRequest {
  message: string;
  userId?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

/**
 * Chat API Route
 * 
 * This endpoint:
 * 1. Receives user's message
 * 2. Calls FAISS service to retrieve relevant context
 * 3. Uses Genkit/Gemini to generate response with RAG
 * 4. Returns the AI response
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, userId, conversationHistory = [] } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Step 1: Search FAISS for relevant context
    let diseasesContext = '';
    let patientRecordsContext = '';

    try {
      const searchResponse = await fetch(`${FAISS_SERVICE_URL}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          top_k: 5,
          search_type: 'both',
          user_id: userId,
        }),
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        
        // Format diseases context
        if (searchData.diseases_results && searchData.diseases_results.length > 0) {
          diseasesContext = searchData.diseases_results
            .map((result: any, idx: number) => {
              const meta = result.metadata;
              return `
Disease ${idx + 1}: ${meta.name}
Symptoms: ${meta.symptoms}
Treatments: ${meta.treatments}
Code: ${meta.code}
`.trim();
            })
            .join('\n\n');
        }

        // Format patient records context
        if (searchData.patient_records_results && searchData.patient_records_results.length > 0) {
          patientRecordsContext = searchData.patient_records_results
            .map((result: any, idx: number) => {
              const meta = result.metadata;
              return `
Patient Record ${idx + 1}:
Type: ${meta.type}
Title: ${meta.title}
Date: ${meta.date}
Content: ${meta.content || 'N/A'}
`.trim();
            })
            .join('\n\n');
        }
      } else {
        console.warn('FAISS service returned error:', searchResponse.status);
      }
    } catch (error) {
      console.error('Error calling FAISS service:', error);
      // Continue without context - the AI will still respond
    }

    // Step 2: Generate response using Genkit RAG flow
    const response = await chatWithRAG({
      userMessage: message,
      diseasesContext,
      patientRecordsContext,
      conversationHistory,
    });

    return NextResponse.json({
      response: response.answer,
      sources: response.sources,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  try {
    // Check if FAISS service is available
    const healthCheck = await fetch(`${FAISS_SERVICE_URL}/health`).catch(() => null);
    
    return NextResponse.json({
      status: 'ok',
      faissServiceAvailable: healthCheck?.ok || false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      faissServiceAvailable: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}


