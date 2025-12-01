"""
Index Initialization Script
============================

This script creates the initial FAISS indices from:
1. CSV dataset (diseases)
2. Firestore patient records (optional)

Run this script ONCE to build your initial indices:
    python initialize_indices.py

After running, the indices will be saved to disk and can be loaded by the API server.
"""

import os
import sys
import numpy as np
from dotenv import load_dotenv

# Add current directory to path so we can import our modules
sys.path.insert(0, os.path.dirname(__file__))

from embeddings import EmbeddingService
from faiss_manager import FAISSManager
from data_loader import DataLoader

# Load environment variables
load_dotenv()

# Get paths from environment
DISEASES_INDEX_PATH = os.getenv("DISEASES_INDEX_PATH", "../indices/diseases_index.faiss")
PATIENT_RECORDS_INDEX_PATH = os.getenv("PATIENT_RECORDS_INDEX_PATH", "../indices/patient_records_index.faiss")
METADATA_DIR = os.getenv("METADATA_DIR", "../indices/metadata")


def initialize_diseases_index():
    """
    Step 1: Create the diseases index from CSV.
    
    This function:
    1. Loads the CSV file
    2. Prepares text chunks
    3. Generates embeddings
    4. Creates FAISS index
    5. Saves to disk
    """
    print("\n" + "="*60)
    print("STEP 1: Initializing Diseases Index")
    print("="*60)
    
    try:
        # Initialize services
        print("\n📦 Initializing services...")
        embedding_service = EmbeddingService()
        dimension = embedding_service.get_embedding_dimension()
        faiss_manager = FAISSManager(dimension=dimension)
        
        # Create diseases index
        faiss_manager.create_diseases_index()
        
        # Load data
        print("\n📖 Loading diseases from CSV...")
        data_loader = DataLoader()
        diseases = data_loader.load_diseases_from_csv()
        
        # Prepare chunks
        print("\n🔨 Preparing chunks...")
        chunks = data_loader.prepare_disease_chunks(diseases)
        
        # Extract texts for embedding
        texts = [chunk["text"] for chunk in chunks]
        
        # Generate embeddings (this may take a few minutes)
        print(f"\n🧮 Generating embeddings for {len(texts)} diseases...")
        print("   This may take a few minutes. Please wait...")
        embeddings = embedding_service.embed_batch(texts, batch_size=10)
        
        # Convert to numpy array
        vectors = np.array(embeddings).astype('float32')
        
        # Add to index
        print("\n💾 Adding vectors to FAISS index...")
        faiss_manager.add_vectors_to_diseases_index(vectors, chunks)
        
        # Save index and metadata
        print("\n💿 Saving index to disk...")
        faiss_manager.save_index(faiss_manager.diseases_index, DISEASES_INDEX_PATH)
        faiss_manager.save_metadata(
            faiss_manager.diseases_metadata,
            os.path.join(METADATA_DIR, "diseases_metadata.json")
        )
        
        print(f"\n✅ Diseases index created successfully!")
        print(f"   - Total vectors: {faiss_manager.diseases_index.ntotal}")
        print(f"   - Index file: {DISEASES_INDEX_PATH}")
        print(f"   - Metadata file: {os.path.join(METADATA_DIR, 'diseases_metadata.json')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error creating diseases index: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def initialize_patient_records_index():
    """
    Step 2: Create the patient records index from Firestore.
    
    This function:
    1. Connects to Firestore
    2. Loads patient records
    3. Prepares text chunks
    4. Generates embeddings
    5. Creates FAISS index
    6. Saves to disk
    
    Note: This requires Firebase credentials and may take longer.
    """
    print("\n" + "="*60)
    print("STEP 2: Initializing Patient Records Index")
    print("="*60)
    
    try:
        # Initialize services
        print("\n📦 Initializing services...")
        embedding_service = EmbeddingService()
        dimension = embedding_service.get_embedding_dimension()
        faiss_manager = FAISSManager(dimension=dimension)
        
        # Create patient records index
        faiss_manager.create_patient_records_index()
        
        # Load data
        print("\n📖 Loading patient records from Firestore...")
        data_loader = DataLoader()
        records = data_loader.load_patient_records_from_firestore()
        
        if not records:
            print("⚠️  No patient records found. Skipping patient records index.")
            print("   You can add records later using the /add-vectors endpoint.")
            return True
        
        # Prepare chunks
        print("\n🔨 Preparing chunks...")
        chunks = data_loader.prepare_patient_record_chunks(records)
        
        if not chunks:
            print("⚠️  No valid chunks prepared. Skipping patient records index.")
            return True
        
        # Extract texts for embedding
        texts = [chunk["text"] for chunk in chunks]
        
        # Generate embeddings
        print(f"\n🧮 Generating embeddings for {len(texts)} patient records...")
        print("   This may take a while. Please wait...")
        embeddings = embedding_service.embed_batch(texts, batch_size=10)
        
        # Convert to numpy array
        vectors = np.array(embeddings).astype('float32')
        
        # Add to index
        print("\n💾 Adding vectors to FAISS index...")
        faiss_manager.add_vectors_to_patient_records_index(vectors, chunks)
        
        # Save index and metadata
        print("\n💿 Saving index to disk...")
        faiss_manager.save_index(
            faiss_manager.patient_records_index,
            PATIENT_RECORDS_INDEX_PATH
        )
        faiss_manager.save_metadata(
            faiss_manager.patient_records_metadata,
            os.path.join(METADATA_DIR, "patient_records_metadata.json")
        )
        
        print(f"\n✅ Patient records index created successfully!")
        print(f"   - Total vectors: {faiss_manager.patient_records_index.ntotal}")
        print(f"   - Index file: {PATIENT_RECORDS_INDEX_PATH}")
        print(f"   - Metadata file: {os.path.join(METADATA_DIR, 'patient_records_metadata.json')}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error creating patient records index: {str(e)}")
        print("   This is okay if Firebase is not set up yet.")
        import traceback
        traceback.print_exc()
        return False


def main():
    """
    Main function to initialize both indices.
    """
    print("\n" + "="*60)
    print("FAISS Index Initialization")
    print("="*60)
    print("\nThis script will:")
    print("1. Create diseases index from CSV")
    print("2. Create patient records index from Firestore (optional)")
    print("\nMake sure you have:")
    print("  - GOOGLE_AI_API_KEY in .env file")
    print("  - CSV file at the specified path")
    print("  - Firebase credentials (optional, for patient records)")
    
    response = input("\nContinue? (y/n): ")
    if response.lower() != 'y':
        print("Cancelled.")
        return
    
    # Initialize diseases index
    diseases_success = initialize_diseases_index()
    
    # Initialize patient records index (optional)
    print("\n" + "-"*60)
    response = input("\nInitialize patient records index? (y/n): ")
    if response.lower() == 'y':
        patient_records_success = initialize_patient_records_index()
    else:
        print("Skipping patient records index.")
        patient_records_success = True
    
    # Summary
    print("\n" + "="*60)
    print("Initialization Summary")
    print("="*60)
    print(f"Diseases Index: {'✅ Success' if diseases_success else '❌ Failed'}")
    print(f"Patient Records Index: {'✅ Success' if patient_records_success else '❌ Skipped/Failed'}")
    
    if diseases_success:
        print("\n🎉 You can now start the API server:")
        print("   python main.py")
        print("\n   Or:")
        print("   uvicorn main:app --reload")


if __name__ == "__main__":
    main()


