"""
Data Loader Module
==================

This module loads data from two sources:
1. CSV file (Diseases dataset)
2. Firestore (Patient health records)

It processes the data and prepares it for embedding and indexing.
"""

import os
import pandas as pd
import json
from typing import List, Dict, Any, Optional
from pathlib import Path

# Firebase imports (we'll set this up)
try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️  Firebase not available. Patient records loading will be disabled.")


class DataLoader:
    """
    Loads and processes data from CSV and Firestore.
    
    This class:
    - Reads CSV file with diseases data
    - Connects to Firestore to get patient records
    - Formats data into chunks ready for embedding
    """
    
    def __init__(self, csv_path: Optional[str] = None, firebase_credentials_path: Optional[str] = None):
        """
        Initialize the data loader.
        
        Args:
            csv_path: Path to the diseases CSV file
            firebase_credentials_path: Path to Firebase service account JSON
        """
        self.csv_path = csv_path or os.getenv("CSV_DATASET_PATH")
        self.firebase_credentials_path = firebase_credentials_path or os.getenv("FIREBASE_CREDENTIALS_PATH")
        
        # Initialize Firebase if credentials are provided
        self.firestore_db = None
        if FIREBASE_AVAILABLE and self.firebase_credentials_path:
            self._init_firebase()
    
    def _init_firebase(self):
        """
        Initialize Firebase Admin SDK to access Firestore.
        
        This allows us to read patient health records from your Firestore database.
        """
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Initialize with service account credentials
                cred = credentials.Certificate(self.firebase_credentials_path)
                firebase_admin.initialize_app(cred)
                print("✅ Firebase initialized successfully")
            
            # Get Firestore database instance
            self.firestore_db = firestore.client()
            print("✅ Firestore connection established")
        except Exception as e:
            print(f"⚠️  Firebase initialization failed: {str(e)}")
            print("   Patient records loading will be disabled")
            self.firestore_db = None
    
    def load_diseases_from_csv(self) -> List[Dict[str, Any]]:
        """
        Load diseases data from CSV file.
        
        CSV Structure:
        - Code: Disease code
        - Name: Disease name
        - Symptoms: Comma-separated symptoms
        - Treatments: Comma-separated treatments
        
        Returns:
            List of dictionaries, each containing disease information
        """
        if not self.csv_path:
            raise ValueError("CSV path not specified")
        
        # Check if file exists
        if not os.path.exists(self.csv_path):
            raise FileNotFoundError(f"CSV file not found: {self.csv_path}")
        
        print(f"📖 Loading diseases from CSV: {self.csv_path}")
        
        # Read CSV using pandas
        df = pd.read_csv(self.csv_path)
        
        # Convert to list of dictionaries
        diseases = []
        for _, row in df.iterrows():
            disease = {
                "code": str(row.get("Code", "")),
                "name": str(row.get("Name", "")),
                "symptoms": str(row.get("Symptoms", "")),
                "treatments": str(row.get("Treatments", "")),
            }
            diseases.append(disease)
        
        print(f"✅ Loaded {len(diseases)} diseases from CSV")
        return diseases
    
    def prepare_disease_chunks(self, diseases: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prepare disease data into text chunks for embedding.
        
        We create chunks that combine all relevant information:
        - Disease name
        - Symptoms
        - Treatments
        
        This helps the RAG system find relevant diseases when users ask questions.
        
        Args:
            diseases: List of disease dictionaries
            
        Returns:
            List of chunk dictionaries with text and metadata
        """
        chunks = []
        
        for disease in diseases:
            # Create a comprehensive text chunk
            # This text will be embedded and searched
            chunk_text = f"""
            Disease: {disease['name']}
            Code: {disease['code']}
            Symptoms: {disease['symptoms']}
            Treatments: {disease['treatments']}
            """.strip()
            
            chunk = {
                "text": chunk_text,
                "metadata": {
                    "code": disease["code"],
                    "name": disease["name"],
                    "symptoms": disease["symptoms"],
                    "treatments": disease["treatments"],
                    "chunk_type": "disease",
                    "source": "csv"
                }
            }
            chunks.append(chunk)
        
        print(f"✅ Prepared {len(chunks)} disease chunks")
        return chunks
    
    def load_patient_records_from_firestore(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Load patient health records from Firestore.
        
        Note: This requires:
        1. Firebase service account JSON file
        2. Proper Firestore permissions
        3. Records must be decrypted (handled by your existing code)
        
        Args:
            limit: Maximum number of records to load (None = all)
            
        Returns:
            List of patient record dictionaries
        """
        if not self.firestore_db:
            print("⚠️  Firestore not available, skipping patient records")
            return []
        
        print("📖 Loading patient records from Firestore...")
        
        try:
            # Get all health records from Firestore
            # Note: Your records are encrypted, so you'll need to decrypt them
            # This is a simplified version - you may need to adapt based on your encryption setup
            
            records_ref = self.firestore_db.collection("healthRecords")
            docs = records_ref.limit(limit).get() if limit else records_ref.stream()
            
            records = []
            for doc in docs:
                data = doc.to_dict()
                
                # Extract basic info (adjust based on your Firestore structure)
                record = {
                    "recordId": doc.id,
                    "userId": data.get("userId", ""),
                    "type": data.get("type", ""),
                    # Note: You'll need to decrypt encryptedData here
                    # This is a placeholder - adapt to your decryption logic
                    "title": "Health Record",  # Decrypt from encryptedData
                    "content": "",  # Decrypt from encryptedData
                    "date": data.get("date", ""),
                }
                records.append(record)
            
            print(f"✅ Loaded {len(records)} patient records from Firestore")
            return records
            
        except Exception as e:
            print(f"⚠️  Error loading patient records: {str(e)}")
            return []
    
    def prepare_patient_record_chunks(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Prepare patient records into text chunks for embedding.
        
        Args:
            records: List of patient record dictionaries
            
        Returns:
            List of chunk dictionaries with text and metadata
        """
        chunks = []
        
        for record in records:
            # Skip records without content
            if not record.get("content"):
                continue
            
            # Create text chunk from record
            chunk_text = f"""
            Record Type: {record.get('type', 'unknown')}
            Title: {record.get('title', 'Untitled')}
            Date: {record.get('date', '')}
            Content: {record.get('content', '')}
            """.strip()
            
            chunk = {
                "text": chunk_text,
                "metadata": {
                    "recordId": record.get("recordId"),
                    "userId": record.get("userId"),
                    "type": record.get("type"),
                    "title": record.get("title"),
                    "date": record.get("date"),
                    "chunk_type": "patient_record",
                    "source": "firestore"
                }
            }
            chunks.append(chunk)
        
        print(f"✅ Prepared {len(chunks)} patient record chunks")
        return chunks
    
    def load_all_data(self) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Load all data from both sources.
        
        Returns:
            Tuple of (disease_chunks, patient_record_chunks)
        """
        # Load diseases
        diseases = self.load_diseases_from_csv()
        disease_chunks = self.prepare_disease_chunks(diseases)
        
        # Load patient records (optional, can be empty if Firebase not set up)
        patient_records = self.load_patient_records_from_firestore()
        patient_record_chunks = self.prepare_patient_record_chunks(patient_records)
        
        return disease_chunks, patient_record_chunks


