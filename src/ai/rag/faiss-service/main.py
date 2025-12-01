"""
FAISS Service - Main API Server
=================================

This is the FastAPI server that provides HTTP endpoints for:
- Searching the FAISS indices
- Adding new vectors (for incremental updates)
- Rebuilding indices

The Next.js app will call these endpoints to perform RAG operations.
"""

import os
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
from dotenv import load_dotenv

# Import our custom modules
from embeddings import EmbeddingService
from faiss_manager import FAISSManager
from data_loader import DataLoader

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="FAISS RAG Service",
    description="Vector search service for RAG pipeline",
    version="1.0.0"
)

# Enable CORS (so Next.js can call this service)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services (these will be loaded on startup)
embedding_service: Optional[EmbeddingService] = None
faiss_manager: Optional[FAISSManager] = None

# Get paths from environment
DISEASES_INDEX_PATH = os.getenv("DISEASES_INDEX_PATH", "../indices/diseases_index.faiss")
PATIENT_RECORDS_INDEX_PATH = os.getenv("PATIENT_RECORDS_INDEX_PATH", "../indices/patient_records_index.faiss")
METADATA_DIR = os.getenv("METADATA_DIR", "../indices/metadata")


# ==================== Request/Response Models ====================

class SearchRequest(BaseModel):
    """Request model for search endpoint."""
    query: str  # User's question
    top_k: int = 5  # Number of results to return
    search_type: str = "both"  # "diseases", "patient_records", or "both"
    user_id: Optional[str] = None  # Filter patient records by user


class SearchResult(BaseModel):
    """Single search result."""
    metadata: Dict[str, Any]
    score: float  # Similarity score (0-1, higher is better)
    distance: float  # Distance in vector space
    rank: int


class SearchResponse(BaseModel):
    """Response model for search endpoint."""
    diseases_results: List[SearchResult] = []
    patient_records_results: List[SearchResult] = []
    query_embedding_dimension: int


class AddVectorsRequest(BaseModel):
    """Request model for adding vectors."""
    texts: List[str]  # Texts to embed and add
    metadata: List[Dict[str, Any]]  # Metadata for each text
    index_type: str  # "diseases" or "patient_records"


# ==================== Startup/Shutdown ====================

@app.on_event("startup")
async def startup_event():
    """
    Initialize services when the server starts.
    
    This loads:
    - Embedding service (for generating embeddings)
    - FAISS manager (loads existing indices from disk)
    """
    global embedding_service, faiss_manager
    
    print("🚀 Starting FAISS RAG Service...")
    
    try:
        # Initialize embedding service
        embedding_service = EmbeddingService()
        print("✅ Embedding service ready")
        
        # Initialize FAISS manager
        dimension = embedding_service.get_embedding_dimension()
        faiss_manager = FAISSManager(dimension=dimension)
        
        # Try to load existing indices
        try:
            faiss_manager.load_all(
                diseases_index_path=DISEASES_INDEX_PATH,
                patient_records_index_path=PATIENT_RECORDS_INDEX_PATH,
                metadata_dir=METADATA_DIR
            )
            print("✅ Loaded existing indices")
        except FileNotFoundError:
            print("⚠️  No existing indices found. Create them using the initialization script.")
        
        print("✅ FAISS RAG Service ready!")
        
    except Exception as e:
        print(f"❌ Startup error: {str(e)}")
        raise


# ==================== API Endpoints ====================

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "FAISS RAG Service",
        "diseases_index_loaded": faiss_manager.diseases_index is not None if faiss_manager else False,
        "patient_records_index_loaded": faiss_manager.patient_records_index is not None if faiss_manager else False,
    }


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search for similar content in the FAISS indices.
    
    This is the main endpoint used by the RAG system:
    1. Embeds the user's query
    2. Searches both indices (diseases and patient records)
    3. Returns the most similar content
    
    Example request:
    {
        "query": "What are the symptoms of fever?",
        "top_k": 5,
        "search_type": "both",
        "user_id": "user123"
    }
    """
    if not embedding_service or not faiss_manager:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    try:
        # Embed the query
        query_embedding = embedding_service.embed_text(request.query)
        query_vector = np.array([query_embedding])  # Shape: (1, dimension)
        
        diseases_results = []
        patient_records_results = []
        
        # Search diseases index
        if request.search_type in ["diseases", "both"]:
            if faiss_manager.diseases_index is not None:
                diseases_results = faiss_manager.search_diseases(
                    query_vector,
                    top_k=request.top_k
                )
        
        # Search patient records index
        if request.search_type in ["patient_records", "both"]:
            if faiss_manager.patient_records_index is not None:
                patient_records_results = faiss_manager.search_patient_records(
                    query_vector,
                    top_k=request.top_k,
                    user_id=request.user_id
                )
        
        return SearchResponse(
            diseases_results=[SearchResult(**r) for r in diseases_results],
            patient_records_results=[SearchResult(**r) for r in patient_records_results],
            query_embedding_dimension=len(query_embedding)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search error: {str(e)}")


@app.post("/add-vectors")
async def add_vectors(request: AddVectorsRequest):
    """
    Add new vectors to an index (for incremental updates).
    
    This is used when:
    - A new patient record is created
    - The diseases CSV is updated
    
    Example request:
    {
        "texts": ["New disease: ...", "Another disease: ..."],
        "metadata": [{"name": "Disease 1", ...}, {"name": "Disease 2", ...}],
        "index_type": "diseases"
    }
    """
    if not embedding_service or not faiss_manager:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    if len(request.texts) != len(request.metadata):
        raise HTTPException(status_code=400, detail="Texts and metadata must have same length")
    
    try:
        # Embed all texts
        embeddings = embedding_service.embed_batch(request.texts)
        vectors = np.array(embeddings)
        
        # Prepare chunks
        chunks = [
            {"text": text, "metadata": meta}
            for text, meta in zip(request.texts, request.metadata)
        ]
        
        # Add to appropriate index
        if request.index_type == "diseases":
            faiss_manager.add_vectors_to_diseases_index(vectors, chunks)
            # Save updated index
            faiss_manager.save_index(
                faiss_manager.diseases_index,
                DISEASES_INDEX_PATH
            )
            faiss_manager.save_metadata(
                faiss_manager.diseases_metadata,
                os.path.join(METADATA_DIR, "diseases_metadata.json")
            )
            
        elif request.index_type == "patient_records":
            faiss_manager.add_vectors_to_patient_records_index(vectors, chunks)
            # Save updated index
            faiss_manager.save_index(
                faiss_manager.patient_records_index,
                PATIENT_RECORDS_INDEX_PATH
            )
            faiss_manager.save_metadata(
                faiss_manager.patient_records_metadata,
                os.path.join(METADATA_DIR, "patient_records_metadata.json")
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid index_type")
        
        return {
            "status": "success",
            "message": f"Added {len(request.texts)} vectors to {request.index_type} index",
            "total_vectors": len(request.texts)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding vectors: {str(e)}")


@app.post("/rebuild-index")
async def rebuild_index(index_type: str):
    """
    Rebuild an index from scratch.
    
    This is useful when:
    - The CSV file is updated
    - You want to refresh the entire index
    
    Args:
        index_type: "diseases" or "patient_records"
    """
    if not faiss_manager:
        raise HTTPException(status_code=500, detail="Service not initialized")
    
    try:
        if index_type == "diseases":
            # This would require reloading from CSV
            # For now, just return a message
            return {
                "status": "info",
                "message": "Use the initialization script to rebuild the diseases index"
            }
        elif index_type == "patient_records":
            return {
                "status": "info",
                "message": "Use the initialization script to rebuild the patient records index"
            }
        else:
            raise HTTPException(status_code=400, detail="Invalid index_type")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ==================== Run Server ====================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    
    print(f"🌐 Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)

