# Step-by-Step Setup Guide

This guide will walk you through setting up the FAISS RAG service from scratch. Follow each step carefully.

## Prerequisites

Before starting, make sure you have:
- ✅ Python 3.8 or higher installed
- ✅ A Google account (for API key)
- ✅ Your CSV file at `datasets/Diseases Symptoms.csv`

---

## Step 1: Navigate to the Service Directory

Open your terminal and go to the FAISS service directory:

```bash
cd src/ai/rag/faiss-service
```

You should now be in: `/Users/harshnagrani/Desktop/LY-Project/src/ai/rag/faiss-service`

---

## Step 2: Create Python Virtual Environment

A virtual environment keeps Python packages isolated for this project.

**On Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**What you'll see:**
- Your terminal prompt will show `(venv)` at the beginning
- This means the virtual environment is active

**If you see an error:**
- Make sure Python is installed: `python3 --version` or `python --version`
- If Python is not found, install it from python.org

---

## Step 3: Install Dependencies

Install all required Python packages:

```bash
pip install -r requirements.txt
```

**This will install:**
- FAISS (vector search library)
- FastAPI (web framework)
- Google AI (for embeddings)
- And other dependencies

**What to expect:**
- This may take 2-5 minutes
- You'll see lots of installation messages
- At the end, you should see "Successfully installed..."

**If you see errors:**
- Make sure your virtual environment is activated (you should see `(venv)`)
- Try: `pip install --upgrade pip` first
- On Mac, you might need: `pip3 install -r requirements.txt`

---

## Step 4: Get Google AI API Key

You need an API key to generate embeddings (vector representations of text).

1. **Go to Google AI Studio:**
   - Visit: https://aistudio.google.com/
   - Sign in with your Google account

2. **Create API Key:**
   - Click "Get API Key" button
   - Click "Create API Key in new project" (or use existing project)
   - Copy the API key (it looks like: `AIzaSy...`)

3. **Save the API key:**
   - You'll need it in the next step
   - Keep it secret! Don't share it publicly

---

## Step 5: Create Environment File

Create a `.env` file to store your configuration:

```bash
# Copy the example file
cp .env.example .env
```

**Then edit `.env` file:**
- Open it in a text editor
- Replace `your_google_ai_api_key_here` with your actual API key from Step 4
- Save the file

**Your `.env` should look like:**
```env
GOOGLE_AI_API_KEY=AIzaSyADMOaiOCtnuZhIsVTNUmRJ4IZw-eysAtU
EMBEDDING_MODEL=text-embedding-004
DISEASES_INDEX_PATH=../indices/diseases_index.faiss
PATIENT_RECORDS_INDEX_PATH=../indices/patient_records_index.faiss
METADATA_DIR=../indices/metadata
CSV_DATASET_PATH=../../../datasets/Diseases Symptoms.csv
PORT=8000
HOST=127.0.0.1
```

**Important:**
- Don't commit `.env` to git (it's already in `.gitignore`)
- Keep your API key secret

---

## Step 6: Verify CSV File Path

Make sure your CSV file exists at the correct location:

```bash
# From faiss-service directory, check if CSV exists
ls ../../../datasets/Diseases\ Symptoms.csv
```

**If the file is not found:**
- Check the actual path to your CSV file
- Update `CSV_DATASET_PATH` in `.env` with the correct path

---

## Step 7: Initialize FAISS Indices

This is the most important step! It creates the vector database from your CSV.

```bash
python initialize_indices.py
```

**What happens:**
1. Script loads your CSV file
2. For each disease, it creates a text chunk
3. Sends each chunk to Google's API to get embeddings (vectors)
4. Stores all vectors in a FAISS index
5. Saves the index to disk

**What to expect:**
- This will take 5-10 minutes (depending on CSV size)
- You'll see progress messages like:
  - "📖 Loading diseases from CSV..."
  - "🧮 Generating embeddings for 401 diseases..."
  - "💾 Adding vectors to FAISS index..."
- At the end: "✅ Diseases index created successfully!"

**If you see errors:**
- **"GOOGLE_AI_API_KEY not found"**: Check your `.env` file
- **"CSV file not found"**: Check the path in `.env`
- **API errors**: Check your API key is valid and has credits

**After completion:**
- You'll have new files in `../indices/`:
  - `diseases_index.faiss` (the vector database)
  - `metadata/diseases_metadata.json` (mapping of IDs to disease info)

---

## Step 8: Start the API Server

Now start the service so your Next.js app can use it:

```bash
python main.py
```

**Or using uvicorn:**
```bash
uvicorn main:app --reload
```

**What you'll see:**
```
🚀 Starting FAISS RAG Service...
✅ Embedding service ready
✅ Loaded existing indices
✅ FAISS RAG Service ready!
🌐 Starting server on 127.0.0.1:8000
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**The server is now running!** Keep this terminal open.

---

## Step 9: Test the Service

Open a **new terminal window** (keep the server running) and test:

```bash
curl http://localhost:8000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "service": "FAISS RAG Service",
  "diseases_index_loaded": true,
  "patient_records_index_loaded": false
}
```

**If you see an error:**
- Make sure the server is running in the other terminal
- Check that port 8000 is not being used by another program

---

## Step 10: Test a Search Query

Test the search functionality:

```bash
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the symptoms of fever?",
    "top_k": 3,
    "search_type": "diseases"
  }'
```

**Expected response:**
- You should see JSON with search results
- Each result has metadata about diseases
- Results are ranked by similarity to your query

---

## ✅ Setup Complete!

Your FAISS service is now running and ready to use!

### What You've Built:

1. ✅ **Vector Database**: FAISS index with all diseases from CSV
2. ✅ **API Server**: Running on localhost:8000
3. ✅ **Search Endpoint**: Can find similar content to any query

### Next Steps:

1. **Integrate with Next.js:**
   - Create API route in Next.js that calls this service
   - Build chat UI component
   - Connect to Gemini for final answer generation

2. **Add Patient Records (Optional):**
   - Set up Firebase credentials
   - Run initialization again to include patient records
   - Or use `/add-vectors` endpoint to add records incrementally

---

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:** Make sure virtual environment is activated (`(venv)` in prompt)

### Issue: Port 8000 already in use
**Solution:** Change `PORT=8001` in `.env` and restart server

### Issue: API key errors
**Solution:** 
- Verify API key in `.env` is correct
- Check you have credits/quota in Google AI Studio
- Make sure API key has embedding permissions

### Issue: Index not found
**Solution:** Run `python initialize_indices.py` first

### Issue: Slow embedding generation
**Solution:** This is normal! It takes time to embed hundreds of diseases. Be patient.

---

## Quick Reference

**Start server:**
```bash
cd src/ai/rag/faiss-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

**Rebuild indices:**
```bash
python initialize_indices.py
```

**Check health:**
```bash
curl http://localhost:8000/health
```

**Stop server:**
- Press `Ctrl+C` in the terminal where server is running

---

## Need Help?

- Check the main `README.md` for more details
- Review error messages carefully
- Make sure all prerequisites are installed
- Verify all paths in `.env` are correct

Good luck! 🚀


