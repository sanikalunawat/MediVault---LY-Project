# FAISS RAG Service

This is the Python microservice that powers the RAG (Retrieval-Augmented Generation) system for your health records application.

## What is This?

This service:
- **Stores** vector embeddings of your diseases dataset and patient records
- **Searches** for similar content when users ask questions
- **Provides** an API that your Next.js app calls to perform RAG operations

## Architecture Overview

```
User Query (Next.js)
    ↓
FAISS Service API (/search)
    ↓
1. Embed query → 2. Search indices → 3. Return similar content
    ↓
Next.js receives results → Sends to Gemini → Returns answer
```

## Directory Structure

```
faiss-service/
├── main.py                 # FastAPI server (the API)
├── embeddings.py           # Google Embedding API integration
├── faiss_manager.py        # FAISS index management
├── data_loader.py          # Loads CSV and Firestore data
├── initialize_indices.py   # Script to build initial indices
├── requirements.txt        # Python dependencies
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Setup Instructions

### Step 1: Install Python

Make sure you have Python 3.8+ installed:
```bash
python3 --version
```

### Step 2: Create Virtual Environment

```bash
cd src/ai/rag/faiss-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Set Up Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Google AI API key:
   ```env
   GOOGLE_AI_API_KEY=your_api_key_here
   ```

   **How to get Google AI API key:**
   - Go to https://aistudio.google.com/
   - Sign in with your Google account
   - Click "Get API Key"
   - Create a new API key
   - Copy and paste it into `.env`

3. Verify other paths in `.env` are correct (they should be by default)

### Step 5: Initialize Indices (One-Time Setup)

This creates the FAISS indices from your CSV and Firestore data:

```bash
python initialize_indices.py
```

**What this does:**
1. Loads diseases from CSV
2. Generates embeddings for each disease
3. Creates FAISS index
4. Saves to disk (`../indices/diseases_index.faiss`)

**Note:** This may take 5-10 minutes depending on your dataset size.

### Step 6: Start the API Server

```bash
python main.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload
```

The server will start on `http://localhost:8000`

### Step 7: Test the Service

Open another terminal and test:

```bash
curl http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "FAISS RAG Service",
  "diseases_index_loaded": true,
  "patient_records_index_loaded": false
}
```

## API Endpoints

### 1. Health Check
```
GET /health
```
Returns service status and index information.

### 2. Search
```
POST /search
```

**Request:**
```json
{
  "query": "What are the symptoms of fever?",
  "top_k": 5,
  "search_type": "both",
  "user_id": "user123"  // Optional, for filtering patient records
}
```

**Response:**
```json
{
  "diseases_results": [
    {
      "metadata": {
        "name": "Fever",
        "symptoms": "...",
        "treatments": "..."
      },
      "score": 0.95,
      "distance": 0.05,
      "rank": 1
    }
  ],
  "patient_records_results": [],
  "query_embedding_dimension": 768
}
```

### 3. Add Vectors (Incremental Updates)
```
POST /add-vectors
```

**Request:**
```json
{
  "texts": ["New disease: ...", "Another disease: ..."],
  "metadata": [
    {"name": "Disease 1", "code": "101", ...},
    {"name": "Disease 2", "code": "102", ...}
  ],
  "index_type": "diseases"
}
```

Use this when:
- A new patient record is created
- The CSV is updated with new diseases

## How It Works (Detailed)

### 1. Embeddings
- Text → Google Embedding API → Vector (768 numbers)
- Similar texts have similar vectors
- Example: "fever" and "high temperature" will have similar vectors

### 2. FAISS Index
- Stores all vectors in memory
- Allows fast similarity search
- Returns IDs of most similar vectors

### 3. Metadata
- Maps vector IDs to actual content
- Stored as JSON files
- Contains disease info or patient record details

### 4. Search Flow
```
User Query: "What causes headaches?"
    ↓
Embed query → [0.123, -0.456, ...] (vector)
    ↓
Search FAISS index → Find similar vectors
    ↓
Get vector IDs → Lookup metadata
    ↓
Return: Disease info, symptoms, treatments
```

## Troubleshooting

### "GOOGLE_AI_API_KEY not found"
- Make sure `.env` file exists in `faiss-service/` directory
- Check that the API key is correctly set

### "Index file not found"
- Run `initialize_indices.py` first
- Check that paths in `.env` are correct

### "Firebase not available"
- This is okay if you're not loading patient records yet
- The diseases index will still work

### Import errors
- Make sure virtual environment is activated
- Run `pip install -r requirements.txt` again

### Port already in use
- Change `PORT` in `.env` to a different port (e.g., 8001)
- Or stop the process using port 8000

## Next Steps

After the service is running:

1. **Integrate with Next.js:**
   - Create `/api/chat/route.ts` in Next.js
   - Call this service's `/search` endpoint
   - Use results with Gemini to generate answers

2. **Add Incremental Updates:**
   - When new patient records are created
   - Call `/add-vectors` endpoint
   - Or rebuild index periodically

3. **Optimize:**
   - Monitor search performance
   - Adjust `top_k` parameter
   - Consider using GPU FAISS for larger datasets

## File Sizes

- FAISS index files: ~10-50MB (depends on dataset size)
- Metadata JSON: ~1-5MB
- These are stored locally in `../indices/`

## Security Notes

- Keep `.env` file private (it's in `.gitignore`)
- Don't commit API keys to git
- FAISS indices contain no sensitive data (just vectors)
- Patient record metadata should be handled according to your privacy policy

## Support

If you encounter issues:
1. Check the error messages carefully
2. Verify all environment variables are set
3. Make sure Python version is 3.8+
4. Check that all dependencies are installed


