'use server';

import {
  createShare,
  searchPatientsByEmail,
  createConnectionRequest as createRequest,
  getConnectedPatients as getPatients,
  getPendingConnections,
  updateConnectionRequest as updateRequest,
  getHealthRecords,
  getUserDocument as getUser,
  getConnectedDoctors,
  getHealthRecord,
  addDiagnosisToRecord as addDiagnosis,
} from './firebase/firestore';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { Diagnosis } from './types';

export async function createShareLink(userId: string) {
  if (!userId) {
    return { error: 'You must be logged in to share records.' };
  }
  try {
    const shareId = await createShare(userId);
    const host = headers().get('host');
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const shareUrl = `${protocol}://${host}/share/${shareId}`;
    return { url: shareUrl, error: null };
  } catch (error) {
    return { url: null, error: 'Failed to create share link.' };
  }
}

export { searchPatientsByEmail, getConnectedDoctors, getHealthRecord };
export { getUser as getUserDocument };

export async function requestPatientConnection(doctorId: string, patientId: string) {
    const result = await createRequest(doctorId, patientId);
    if(result.success) {
        revalidatePath('/doctor/patients');
    }
    return result;
}

export async function getConnectedPatients(doctorId: string) {
    return getPatients(doctorId);
}

export async function getPendingConnectionRequests(patientId: string) {
    return getPendingConnections(patientId);
}

export async function updateConnectionRequest(patientId: string, doctorId: string, status: 'approved' | 'denied') {
    const result = await updateRequest(patientId, doctorId, status);
    if(result.success) {
        revalidatePath('/dashboard');
        revalidatePath('/doctor/dashboard');
    }
    return result;
}

export async function getPatientRecordForDoctor(doctorId: string, recordId: string) {
    const record = await getHealthRecord(recordId);
    if (!record) {
        throw new Error("Record not found.");
    }
    // Security check
    const doctorDoc = await getUser(doctorId);
    if (!doctorDoc || !doctorDoc.successfulConnections?.includes(record.userId)) {
        throw new Error("You do not have permission to view this record.");
    }
    return record;
}


export async function addDiagnosisToRecord(doctorId: string, recordId: string, diagnosisData: Omit<Diagnosis, 'doctorId' | 'doctorEmail' | 'createdAt'>) {
    const record = await getHealthRecord(recordId);
    if (!record) {
        return { success: false, error: "Record not found." };
    }
    const doctor = await getUser(doctorId);
    if (!doctor) {
        return { success: false, error: "Doctor not found." };
    }
     // Security check
    if (!doctor.successfulConnections?.includes(record.userId)) {
        return { success: false, error: "You are not connected with this patient." };
    }

    const diagnosis: Omit<Diagnosis, 'createdAt'> = {
        ...diagnosisData,
        doctorId: doctor.uid,
        doctorEmail: doctor.email,
    };

    const result = await addDiagnosis(recordId, diagnosis);
    if(result.success) {
        revalidatePath(`/doctor/view-records/${record.userId}`);
        revalidatePath(`/dashboard`);
    }
    return result;
}


export async function getPatientRecordsForDoctor(doctorId: string, patientId: string) {
    // Security check: ensure the current user (doctor) is connected to the patient
    if (!doctorId) {
        throw new Error("Authentication error. You must be logged in.");
    }

    const doctorDoc = await getUser(doctorId);

    if (!doctorDoc || !doctorDoc.successfulConnections?.includes(patientId)) {
        throw new Error("You do not have permission to view these records.");
    }
    
    // If permission is granted, fetch the records
    return getHealthRecords(patientId);
}
