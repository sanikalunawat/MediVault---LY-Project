# Integration Notes - Chatbot with FAISS RAG

## What Was Added

### 1. Chat API Route (`src/app/api/chat/route.ts`)
- Handles POST requests for chat messages
- Calls FAISS service to retrieve relevant context
- Uses Genkit RAG flow to generate responses
- Returns AI responses with sources

### 2. RAG Chat Flow (`src/ai/flows/chat-rag.ts`)
- Genkit flow that combines:
  - Retrieved context from FAISS
  - User's question
  - Conversation history
- Generates contextual responses using Gemini

### 3. Chat UI Component (`src/components/dashboard/HealthChatbot.tsx`)
- Beautiful chat interface
- Shows conversation history
- Displays sources/citations
- Handles loading and error states

### 4. Dashboard Integration
- Added chatbot to dashboard page
- Full-width section below health timeline

## Environment Variables Needed

Add to your `.env.local` file:

```env
# FAISS Service URL (defaults to localhost:8000)
FAISS_SERVICE_URL=http://localhost:8000
```

## Setup Steps

### 1. Start FAISS Service

Make sure the Python FAISS service is running:

```bash
cd src/ai/rag/faiss-service
source venv/bin/activate
python main.py
```

The service should be running on `http://localhost:8000`

### 2. Verify Service is Running

Test the health endpoint:

```bash
curl http://localhost:8000/health
```

### 3. Start Next.js App

```bash
npm run dev
```

### 4. Test the Chatbot

1. Go to `/dashboard`
2. Scroll down to see the "Health Assistant Chat" section
3. Ask a question like:
   - "What are the symptoms of fever?"
   - "Tell me about panic disorder"
   - "What treatments are available for headaches?"

## How It Works

1. **User asks a question** in the chat UI
2. **Next.js API route** receives the message
3. **FAISS service** searches for similar content:
   - Searches diseases database
   - Searches patient records (if user is logged in)
4. **Retrieved context** is sent to Genkit/Gemini
5. **Gemini generates** a response using the context
6. **Response is returned** to the user with sources

## Troubleshooting

### "Failed to get response" Error

**Check:**
1. Is FAISS service running? (`curl http://localhost:8000/health`)
2. Is `FAISS_SERVICE_URL` set correctly in `.env.local`?
3. Are the FAISS indices created? (Run `initialize_indices.py`)

### "No relevant information found"

**Possible causes:**
1. FAISS indices not created yet
2. Query doesn't match any content in the database
3. FAISS service not returning results

### Chat not appearing

**Check:**
1. Is the component imported correctly?
2. Check browser console for errors
3. Verify user is logged in (if required)

## Features

✅ **RAG-powered responses** - Uses your diseases database and patient records
✅ **Conversation history** - Maintains context across messages
✅ **Source citations** - Shows which diseases/records were used
✅ **Error handling** - Graceful error messages
✅ **Loading states** - Visual feedback during processing
✅ **Responsive design** - Works on all screen sizes

## Next Steps

1. **Add more features:**
   - Voice input
   - Export conversation
   - Save favorite responses
   - Share chat history

2. **Improve RAG:**
   - Fine-tune retrieval parameters
   - Add more context sources
   - Implement re-ranking

3. **Enhance UI:**
   - Markdown rendering
   - Code syntax highlighting
   - Image support
   - File attachments

## API Endpoints

### POST `/api/chat`
**Request:**
```json
{
  "message": "What are the symptoms of fever?",
  "userId": "user123",
  "conversationHistory": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ]
}
```

**Response:**
```json
{
  "response": "Based on the information...",
  "sources": ["Disease Database: Fever"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### GET `/api/chat`
Health check endpoint - returns service status.

