# Quick Start - FAISS RAG Service

## 🚀 Get Started in 5 Minutes

### 1. Setup (One Time)

```bash
cd src/ai/rag/faiss-service
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure

1. Get Google AI API key from https://aistudio.google.com/
2. Create `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your API key:
   ```env
   GOOGLE_AI_API_KEY=your_key_here
   ```

### 3. Build Indices

```bash
python initialize_indices.py
```
⏱️ Takes 5-10 minutes

### 4. Start Server

```bash
python main.py
```

### 5. Test

```bash
curl http://localhost:8000/health
```

## 📁 What Was Created

```
faiss-service/
├── main.py                 # API server
├── embeddings.py           # Google Embedding API
├── faiss_manager.py        # FAISS operations
├── data_loader.py          # CSV/Firestore loader
├── initialize_indices.py   # Build indices script
├── requirements.txt        # Dependencies
└── README.md              # Full documentation
```

## 🔗 API Endpoints

- `GET /health` - Check service status
- `POST /search` - Search for similar content
- `POST /add-vectors` - Add new vectors

## 📖 Full Documentation

- See `SETUP_GUIDE.md` for detailed step-by-step instructions
- See `README.md` for complete documentation


