"""
FAISS Manager Module
====================

This module manages FAISS vector indices - the core of our RAG system.

What is FAISS?
- FAISS (Facebook AI Similarity Search) is a library for efficient similarity search
- It stores vectors (embeddings) and allows fast searching for similar vectors
- Think of it like a smart database that finds similar content quickly

How it works:
1. We create an index with a specific dimension (e.g., 768 for Google embeddings)
2. We add vectors (embeddings) to the index
3. When searching, we embed the query and find the most similar vectors
4. FAISS returns the IDs of similar vectors, which we use to get actual content
"""

import os
import json
import numpy as np
import faiss
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path


class FAISSManager:
    """
    Manages FAISS vector indices for diseases and patient records.
    
    This class handles:
    - Creating new indices
    - Adding vectors to indices
    - Searching for similar vectors
    - Saving/loading indices from disk
    - Managing metadata (mapping vector IDs to actual data)
    """
    
    def __init__(
        self,
        dimension: int = 768,  # Google embedding dimension
        index_type: str = "flat"  # "flat" for exact search, "ivf" for approximate
    ):
        """
        Initialize FAISS manager.
        
        Args:
            dimension: Size of embedding vectors (768 for Google embeddings)
            index_type: Type of FAISS index ("flat" or "ivf")
        """
        self.dimension = dimension
        self.index_type = index_type
        
        # We'll have two separate indices
        self.diseases_index: Optional[faiss.Index] = None
        self.patient_records_index: Optional[faiss.Index] = None
        
        # Metadata stores the actual content for each vector ID
        # Format: {vector_id: {metadata about that chunk}}
        self.diseases_metadata: Dict[int, Dict[str, Any]] = {}
        self.patient_records_metadata: Dict[int, Dict[str, Any]] = {}
        
        # Track next available ID for each index
        self.next_disease_id = 0
        self.next_patient_record_id = 0
        
        print(f"✅ FAISS Manager initialized (dimension: {dimension}, type: {index_type})")
    
    def create_index(self, index_type: str = "flat") -> faiss.Index:
        """
        Create a new empty FAISS index.
        
        Index Types:
        - "flat": Exact search, slower but accurate (good for <100K vectors)
        - "ivf": Approximate search, faster but less accurate (good for >100K vectors)
        
        Args:
            index_type: Type of index to create
            
        Returns:
            New FAISS index
        """
        if index_type == "flat":
            # IndexFlatL2: Uses L2 (Euclidean) distance for similarity
            # This is the simplest and most accurate option
            index = faiss.IndexFlatL2(self.dimension)
            print("✅ Created FlatL2 index (exact search)")
            
        elif index_type == "ivf":
            # IndexIVFFlat: Inverted file index for faster approximate search
            # Requires training on sample data first
            quantizer = faiss.IndexFlatL2(self.dimension)
            nlist = 100  # Number of clusters
            index = faiss.IndexIVFFlat(quantizer, self.dimension, nlist)
            print("✅ Created IVF index (approximate search)")
        else:
            raise ValueError(f"Unknown index type: {index_type}")
        
        return index
    
    def create_diseases_index(self):
        """Create a new empty index for diseases."""
        self.diseases_index = self.create_index(self.index_type)
        self.diseases_metadata = {}
        self.next_disease_id = 0
        print("✅ Diseases index created")
    
    def create_patient_records_index(self):
        """Create a new empty index for patient records."""
        self.patient_records_index = self.create_index(self.index_type)
        self.patient_records_metadata = {}
        self.next_patient_record_id = 0
        print("✅ Patient records index created")
    
    def add_vectors_to_diseases_index(
        self,
        vectors: np.ndarray,
        chunks: List[Dict[str, Any]]
    ):
        """
        Add disease vectors to the diseases index.
        
        Args:
            vectors: NumPy array of shape (n_vectors, dimension)
            chunks: List of chunk dictionaries with metadata
        """
        if self.diseases_index is None:
            self.create_diseases_index()
        
        # Ensure vectors are the right type (float32 for FAISS)
        vectors = vectors.astype('float32')
        
        # Add vectors to index
        self.diseases_index.add(vectors)
        
        # Store metadata for each vector
        for i, chunk in enumerate(chunks):
            vector_id = self.next_disease_id + i
            self.diseases_metadata[vector_id] = chunk["metadata"]
        
        self.next_disease_id += len(vectors)
        print(f"✅ Added {len(vectors)} vectors to diseases index (total: {self.next_disease_id})")
    
    def add_vectors_to_patient_records_index(
        self,
        vectors: np.ndarray,
        chunks: List[Dict[str, Any]]
    ):
        """
        Add patient record vectors to the patient records index.
        
        Args:
            vectors: NumPy array of shape (n_vectors, dimension)
            chunks: List of chunk dictionaries with metadata
        """
        if self.patient_records_index is None:
            self.create_patient_records_index()
        
        # Ensure vectors are the right type
        vectors = vectors.astype('float32')
        
        # Add vectors to index
        self.patient_records_index.add(vectors)
        
        # Store metadata
        for i, chunk in enumerate(chunks):
            vector_id = self.next_patient_record_id + i
            self.patient_records_metadata[vector_id] = chunk["metadata"]
        
        self.next_patient_record_id += len(vectors)
        print(f"✅ Added {len(vectors)} vectors to patient records index (total: {self.next_patient_record_id})")
    
    def search_diseases(
        self,
        query_vector: np.ndarray,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search the diseases index for similar vectors.
        
        Args:
            query_vector: Embedding of the user's query (shape: (1, dimension))
            top_k: Number of results to return
            
        Returns:
            List of dictionaries with metadata and similarity scores
        """
        if self.diseases_index is None or self.diseases_index.ntotal == 0:
            return []
        
        # Ensure query vector is float32
        query_vector = query_vector.astype('float32').reshape(1, -1)
        
        # Search for similar vectors
        # Returns: distances (lower = more similar) and indices (vector IDs)
        distances, indices = self.diseases_index.search(query_vector, top_k)
        
        # Convert to results with metadata
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < 0:  # FAISS returns -1 for invalid results
                continue
            
            metadata = self.diseases_metadata.get(idx, {})
            results.append({
                "metadata": metadata,
                "score": float(1 / (1 + distance)),  # Convert distance to similarity score (0-1)
                "distance": float(distance),
                "rank": i + 1
            })
        
        return results
    
    def search_patient_records(
        self,
        query_vector: np.ndarray,
        top_k: int = 5,
        user_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Search the patient records index for similar vectors.
        
        Args:
            query_vector: Embedding of the user's query
            top_k: Number of results to return
            user_id: Optional filter to only return records for specific user
            
        Returns:
            List of dictionaries with metadata and similarity scores
        """
        if self.patient_records_index is None or self.patient_records_index.ntotal == 0:
            return []
        
        # Ensure query vector is float32
        query_vector = query_vector.astype('float32').reshape(1, -1)
        
        # Search (get more results if filtering by user_id)
        search_k = top_k * 3 if user_id else top_k
        distances, indices = self.patient_records_index.search(query_vector, search_k)
        
        # Convert to results with metadata and filter by user_id if needed
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < 0:
                continue
            
            metadata = self.patient_records_metadata.get(idx, {})
            
            # Filter by user_id if specified
            if user_id and metadata.get("userId") != user_id:
                continue
            
            results.append({
                "metadata": metadata,
                "score": float(1 / (1 + distance)),
                "distance": float(distance),
                "rank": len(results) + 1
            })
            
            # Stop when we have enough results
            if len(results) >= top_k:
                break
        
        return results
    
    def save_index(self, index: faiss.Index, filepath: str):
        """
        Save a FAISS index to disk.
        
        Args:
            index: The FAISS index to save
            filepath: Path where to save the index file
        """
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save index
        faiss.write_index(index, filepath)
        print(f"✅ Saved index to {filepath}")
    
    def load_index(self, filepath: str) -> faiss.Index:
        """
        Load a FAISS index from disk.
        
        Args:
            filepath: Path to the index file
            
        Returns:
            Loaded FAISS index
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Index file not found: {filepath}")
        
        index = faiss.read_index(filepath)
        print(f"✅ Loaded index from {filepath} ({index.ntotal} vectors)")
        return index
    
    def save_metadata(self, metadata: Dict[int, Dict[str, Any]], filepath: str):
        """
        Save metadata to a JSON file.
        
        Args:
            metadata: Dictionary mapping vector IDs to metadata
            filepath: Path where to save the JSON file
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Convert int keys to strings for JSON
        metadata_str_keys = {str(k): v for k, v in metadata.items()}
        
        with open(filepath, 'w') as f:
            json.dump(metadata_str_keys, f, indent=2)
        
        print(f"✅ Saved metadata to {filepath}")
    
    def load_metadata(self, filepath: str) -> Dict[int, Dict[str, Any]]:
        """
        Load metadata from a JSON file.
        
        Args:
            filepath: Path to the JSON file
            
        Returns:
            Dictionary mapping vector IDs to metadata
        """
        if not os.path.exists(filepath):
            return {}
        
        with open(filepath, 'r') as f:
            metadata_str_keys = json.load(f)
        
        # Convert string keys back to int
        metadata = {int(k): v for k, v in metadata_str_keys.items()}
        
        print(f"✅ Loaded metadata from {filepath} ({len(metadata)} entries)")
        return metadata
    
    def save_all(
        self,
        diseases_index_path: str,
        patient_records_index_path: str,
        metadata_dir: str
    ):
        """
        Save both indices and their metadata to disk.
        
        Args:
            diseases_index_path: Path for diseases index
            patient_records_index_path: Path for patient records index
            metadata_dir: Directory for metadata files
        """
        # Save diseases index
        if self.diseases_index is not None:
            self.save_index(self.diseases_index, diseases_index_path)
            metadata_path = os.path.join(metadata_dir, "diseases_metadata.json")
            self.save_metadata(self.diseases_metadata, metadata_path)
        
        # Save patient records index
        if self.patient_records_index is not None:
            self.save_index(self.patient_records_index, patient_records_index_path)
            metadata_path = os.path.join(metadata_dir, "patient_records_metadata.json")
            self.save_metadata(self.patient_records_metadata, metadata_path)
    
    def load_all(
        self,
        diseases_index_path: str,
        patient_records_index_path: str,
        metadata_dir: str
    ):
        """
        Load both indices and their metadata from disk.
        
        Args:
            diseases_index_path: Path to diseases index
            patient_records_index_path: Path to patient records index
            metadata_dir: Directory containing metadata files
        """
        # Load diseases index
        if os.path.exists(diseases_index_path):
            self.diseases_index = self.load_index(diseases_index_path)
            metadata_path = os.path.join(metadata_dir, "diseases_metadata.json")
            self.diseases_metadata = self.load_metadata(metadata_path)
            self.next_disease_id = max(self.diseases_metadata.keys(), default=-1) + 1
        
        # Load patient records index
        if os.path.exists(patient_records_index_path):
            self.patient_records_index = self.load_index(patient_records_index_path)
            metadata_path = os.path.join(metadata_dir, "patient_records_metadata.json")
            self.patient_records_metadata = self.load_metadata(metadata_path)
            self.next_patient_record_id = max(self.patient_records_metadata.keys(), default=-1) + 1


