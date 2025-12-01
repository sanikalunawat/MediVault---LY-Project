"""
Embeddings Module
=================

This module handles generating vector embeddings from text using Google's Embedding API.

What are embeddings?
- Embeddings are numerical representations of text that capture semantic meaning
- Similar texts have similar embeddings (close in vector space)
- We use embeddings to find similar content in our FAISS index

How it works:
1. Takes text input (like "fever, headache, cough")
2. Sends it to Google's Embedding API
3. Gets back a vector (list of numbers, e.g., 768 dimensions)
4. Returns the vector for storage in FAISS
"""

import os
import google.generativeai as genai
from typing import List, Optional
import time

class EmbeddingService:
    """
    Service class to generate embeddings using Google's API.
    
    This class:
    - Initializes connection to Google AI
    - Converts text to embeddings
    - Handles errors and retries
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "text-embedding-004"):
        """
        Initialize the embedding service.
        
        Args:
            api_key: Google AI API key (if None, reads from env)
            model: Which embedding model to use
        """
        # Get API key from parameter or environment variable
        self.api_key = api_key or os.getenv("GOOGLE_AI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_AI_API_KEY not found in environment variables")
        
        # Configure Google AI with the API key
        genai.configure(api_key=self.api_key)
        self.model = model
        
        # Initialize the embedding model
        # Note: For embeddings, we use genai.embed_content, not a chat model
        print(f"✅ Embedding service initialized with model: {model}")
    
    def embed_text(self, text: str) -> List[float]:
        """
        Convert a single text string into an embedding vector.
        
        Example:
            Input: "fever, headache, cough"
            Output: [0.123, -0.456, 0.789, ...] (768 numbers)
        
        Args:
            text: The text to embed
            
        Returns:
            List of floats representing the embedding vector
        """
        try:
            # Remove extra whitespace
            text = text.strip()
            
            # Skip empty text
            if not text:
                raise ValueError("Cannot embed empty text")
            
            # Generate embedding using Google's API
            # This is a synchronous call that returns the embedding vector
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"  # We're embedding documents for retrieval
            )
            
            # Extract the embedding vector from the result
            embedding = result['embedding']
            
            return embedding
            
        except Exception as e:
            print(f"❌ Error embedding text: {str(e)}")
            raise
    
    def embed_batch(self, texts: List[str], batch_size: int = 10) -> List[List[float]]:
        """
        Convert multiple texts into embeddings (more efficient than one-by-one).
        
        Why batch processing?
        - Faster than individual calls
        - More efficient API usage
        - But we limit batch size to avoid API rate limits
        
        Args:
            texts: List of text strings to embed
            batch_size: How many texts to process at once
            
        Returns:
            List of embedding vectors (one per input text)
        """
        all_embeddings = []
        
        # Process texts in batches
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            batch_embeddings = []
            
            # Embed each text in the batch
            for text in batch:
                try:
                    embedding = self.embed_text(text)
                    batch_embeddings.append(embedding)
                    # Small delay to avoid rate limiting
                    time.sleep(0.1)
                except Exception as e:
                    print(f"⚠️  Failed to embed text, skipping: {str(e)}")
                    # Add zero vector as placeholder (you might want to handle this differently)
                    batch_embeddings.append([0.0] * 768)
            
            all_embeddings.extend(batch_embeddings)
            print(f"📊 Processed batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")
        
        return all_embeddings
    
    def get_embedding_dimension(self) -> int:
        """
        Get the dimension (length) of embeddings from this model.
        
        Different models have different dimensions:
        - text-embedding-004: 768 dimensions
        - models/embedding-001: 768 dimensions
        
        Returns:
            Number of dimensions in the embedding vector
        """
        # Test with a small text to get dimension
        test_embedding = self.embed_text("test")
        return len(test_embedding)


