# Quick Flow Reference

## 🚀 Simple Overview

```
USER → Chat UI → API → FAISS (Find Context) → Gemini (Generate Answer) → Chat UI → USER
```

## 📝 Step-by-Step (Simple)

1. **User asks**: "What are fever symptoms?"
2. **Chat UI** sends message to `/api/chat`
3. **API** calls FAISS service to find similar content
4. **FAISS** searches vector database, finds relevant diseases
5. **API** formats the retrieved context
6. **API** calls Gemini with context + user question
7. **Gemini** generates answer using the context
8. **API** returns answer + sources
9. **Chat UI** displays answer to user

## 🔄 The RAG Flow

```
RAG = Retrieval + Augmentation + Generation

┌──────────────┐
│  RETRIEVAL   │  ← Find relevant info from database
└──────┬───────┘
       │
┌──────▼───────┐
│ AUGMENTATION │  ← Add context to user's question
└──────┬───────┘
       │
┌──────▼───────┐
│  GENERATION  │  ← Generate answer using AI
└──────────────┘
```

## 🎯 Key Components

```
┌─────────────────┐
│  Chat UI        │  ← User sees this
├─────────────────┤
│  /api/chat      │  ← Orchestrates everything
├─────────────────┤
│  FAISS Service  │  ← Searches knowledge base
├─────────────────┤
│  Gemini AI      │  ← Generates answers
└─────────────────┘
```

## 📊 Data Flow (Simple)

```
Text Question
    ↓
Vector (Embedding)
    ↓
Search Similar Vectors
    ↓
Get Relevant Content
    ↓
Add Context to Question
    ↓
Generate AI Response
    ↓
Display Answer
```

## 🔍 What Happens Behind the Scenes

**When user asks "What are fever symptoms?":**

1. Question converted to numbers (vector): `[0.123, -0.456, ...]`
2. System searches for similar content in database
3. Finds: "Fever" disease with symptoms information
4. System asks Gemini: "Based on this context about Fever, answer the user's question"
5. Gemini generates: "Fever symptoms include elevated temperature, chills..."
6. User sees the answer

## ⚡ Performance

- **Fast**: FAISS search takes ~50-200ms
- **Contextual**: Uses your database + patient records
- **Accurate**: AI generates answer based on real data

## 🔗 See Also

- `ARCHITECTURE.md` - Detailed architecture explanation
- `FLOW_DIAGRAM.md` - Complete flow diagrams
- `INTEGRATION_NOTES.md` - Integration details

