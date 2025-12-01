'use server';
import type { User as FirebaseUser } from "firebase/auth";

export interface User extends FirebaseUser {
    role?: 'patient' | 'doctor';
    weight?: number;
    height?: number;
    bloodGroup?: string;
    bmi?: number;
}

export interface UserDocument {
    uid: string;
    email: string;
    role: 'patient' | 'doctor';
    createdAt: any;
    pendingConnections?: string[];
    successfulConnections?: string[];
    weight?: number;
    height?: number;
    bloodGroup?: string;
    bmi?: number;
}

export interface Diagnosis {
  doctorId: string;
  doctorEmail: string;
  diagnosisText: string;
  treatmentPlan: string;
  recommendations: string;
  createdAt: string;
}

export interface HealthRecord {
  id: string;
  userId: string;
  type: 'prescription' | 'lab_report' | 'allergy' | 'note';
  title: string;
  content: string;
  date: string; 
  createdAt: string;
  bloodPressure?: string;
  pulseRate?: number;
  attachmentUrl?: string;
  attachmentCid?: string;
  attachmentEncryptionKey?: string; // base64 encoded AES key
  attachmentEncryptionIv?: string; // base64 encoded IV
  diagnosis?: Diagnosis;
}

// This is no longer needed with the new data model
export interface ConnectionRequest {
    id: string;
    doctorId: string;
    doctorEmail: string;
    patientId: string;
    status: 'pending' | 'approved' | 'denied';
    createdAt: any;
}
