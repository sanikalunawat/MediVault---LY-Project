'use server';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDoc,
  doc,
  Timestamp,
  setDoc,
  updateDoc,
  arrayUnion,
  documentId,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import type { HealthRecord, UserDocument, Diagnosis } from '@/lib/types';
import { encryptObject, decryptObject, type EncryptedBlob } from '@/lib/crypto';

const USERS_COLLECTION = 'users';
const HEALTH_RECORDS_COLLECTION = 'healthRecords';
const SHARES_COLLECTION = 'shares';

const convertRecordTimestamps = (data: any): any => {
    const getDate = (timestamp: any): Date | null => {
        if (!timestamp) return null;
        if (timestamp instanceof Timestamp) {
            return timestamp.toDate();
        }
        if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
            return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
        }
        const d = new Date(timestamp);
        if (!isNaN(d.getTime())) {
          return d;
        }
        return null;
      }
      const date = getDate(data.date);
      const createdAt = getDate(data.createdAt);
      
      const diagnosis = data.diagnosis ? {
          ...data.diagnosis,
          createdAt: getDate(data.diagnosis.createdAt)?.toISOString() ?? new Date().toISOString(),
      } : undefined;

      return {
        ...data,
        date: date ? date.toISOString() : new Date().toISOString(),
        createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
        diagnosis,
      } as unknown as HealthRecord;
}

const convertTimestamp = (data: any) => {
    if (data && data.createdAt && typeof data.createdAt.toDate === 'function') {
        return { ...data, createdAt: data.createdAt.toDate().toISOString() };
    }
    return data;
}

// Get a user document
export const getUserDocument = async (userId: string): Promise<UserDocument | null> => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            return convertTimestamp(data) as UserDocument;
        }
        return null;
    } catch (error) {
        console.error("Error fetching user document:", error);
        throw new Error('Failed to fetch user document.');
    }
}

// Create a user document
export const createUserDocument = async (userId: string, email: string, role: 'patient' | 'doctor', details?: Partial<UserDocument>) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const data: UserDocument = {
            uid: userId,
            email,
            role,
            createdAt: serverTimestamp(),
            pendingConnections: [],
            successfulConnections: [],
            ...details
        };

        if (role === 'patient' && details?.weight && details?.height) {
            const heightInMeters = details.height / 100;
            data.bmi = parseFloat((details.weight / (heightInMeters * heightInMeters)).toFixed(2));
        }

        await setDoc(userRef, data);
    } catch (error) {
        console.error("Error creating user document:", error);
        throw new Error('Failed to create user document.');
    }
}


// Add a new health record for a user (sensitive fields encrypted)
export const addHealthRecord = async (
  userId: string,
  recordData: Omit<HealthRecord, 'id' | 'userId' | 'createdAt' | 'date'> & { date: Date }
) => {
  try {
    // Split metadata (queryable) vs sensitive payload (encrypted)
    const { type, date, title, content, bloodPressure, pulseRate, diagnosis, attachmentUrl, attachmentCid, attachmentEncryptionKey, attachmentEncryptionIv } = recordData as any;
    const sensitivePayload = { title, content, bloodPressure, pulseRate, diagnosis, attachmentUrl, attachmentCid, attachmentEncryptionKey, attachmentEncryptionIv };
    const encryptedData = await encryptObject(sensitivePayload);

    const docRef = await addDoc(collection(db, HEALTH_RECORDS_COLLECTION), {
      userId,
      type,
      date: Timestamp.fromDate(date),
      createdAt: serverTimestamp(),
      encryptedData,
    });

    return { id: docRef.id };
  } catch (error) {
    console.error('Error adding health record: ', error);
    throw new Error('Failed to add health record.');
  }
};

// Get a single health record
export const getHealthRecord = async (recordId: string): Promise<HealthRecord | null> => {
    try {
        const recordRef = doc(db, HEALTH_RECORDS_COLLECTION, recordId);
        const recordSnap = await getDoc(recordRef);
        if (!recordSnap.exists()) {
            return null;
        }
        const data = recordSnap.data() as any;

        // Convert timestamps to ISO strings for metadata
        const meta = convertRecordTimestamps(data);

        // Decrypt sensitive payload
        let decrypted: any = {};
        try {
          if (data.encryptedData) {
            decrypted = await decryptObject<any>(data.encryptedData as EncryptedBlob);
          }
        } catch (e) {
          console.error('Decryption failed for record', recordId, e);
        }

        const result: HealthRecord = {
          id: recordSnap.id,
          userId: meta.userId,
          type: meta.type,
          title: decrypted.title ?? '',
          content: decrypted.content ?? '',
          date: meta.date,
          createdAt: meta.createdAt,
          bloodPressure: decrypted.bloodPressure,
          pulseRate: decrypted.pulseRate,
          diagnosis: decrypted.diagnosis,
          attachmentUrl: decrypted.attachmentUrl,
          attachmentCid: decrypted.attachmentCid,
          attachmentEncryptionKey: decrypted.attachmentEncryptionKey,
          attachmentEncryptionIv: decrypted.attachmentEncryptionIv,
        };
        return result;
    } catch (error) {
        console.error('Error getting health record: ', error);
        throw new Error('Failed to fetch health record.');
    }
}

// Get all health records for a user
export const getHealthRecords = async (userId: string): Promise<HealthRecord[]> => {
  try {
    const q = query(
      collection(db, HEALTH_RECORDS_COLLECTION),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    const records = await Promise.all(querySnapshot.docs.map(async (docSnap) => {
      const data = docSnap.data() as any;
      const meta = convertRecordTimestamps(data);

      let decrypted: any = {};
      try {
        if (data.encryptedData) {
          decrypted = await decryptObject<any>(data.encryptedData as EncryptedBlob);
        }
      } catch (e) {
        console.error('Decryption failed for record', docSnap.id, e);
      }

      const rec: HealthRecord = {
        id: docSnap.id,
        userId: meta.userId,
        type: meta.type,
        title: decrypted.title ?? '',
        content: decrypted.content ?? '',
        date: meta.date,
        createdAt: meta.createdAt,
        bloodPressure: decrypted.bloodPressure,
        pulseRate: decrypted.pulseRate,
        diagnosis: decrypted.diagnosis,
        attachmentUrl: decrypted.attachmentUrl,
        attachmentCid: decrypted.attachmentCid,
        attachmentEncryptionKey: decrypted.attachmentEncryptionKey,
        attachmentEncryptionIv: decrypted.attachmentEncryptionIv,
      };
      return rec;
    }));

    return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error('Error getting health records: ', error);
    throw new Error('Failed to fetch health records.');
  }
};

// Create a shareable link record
export const createShare = async (userId: string) => {
  try {
    const docRef = await addDoc(collection(db, SHARES_COLLECTION), {
      userId,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating share link: ', error);
    throw new Error('Failed to create share link.');
  }
};

// Get shared records by share ID
export const getSharedRecords = async (shareId: string) => {
  try {
    const records = await getHealthRecords(shareId);
    return { records, userId: shareId };
  } catch (error) {
    console.error('Error getting shared records: ', error);
    throw error;
  }
};

// Search for patients by email (exact match)
export const searchPatientsByEmail = async (email: string): Promise<UserDocument[]> => {
    if (!email) return [];
    try {
        const q = query(
            collection(db, USERS_COLLECTION),
            where('role', '==', 'patient'),
            where('email', '==', email)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => convertTimestamp(doc.data()) as UserDocument);
    } catch (error) {
        console.error("Error searching patients:", error);
        return [];
    }
}

// Create a connection request from a doctor to a patient
export const createConnectionRequest = async (doctorId: string, patientId: string) => {
    try {
        const doctorDoc = await getUserDocument(doctorId);
        const patientDoc = await getUserDocument(patientId);

        if (!doctorDoc || !patientDoc) {
             return { success: false, error: "Doctor or patient not found." };
        }
        
        if (doctorDoc.successfulConnections?.includes(patientId)) {
            return { success: false, error: "You are already connected with this patient." };
        }

        if (doctorDoc.pendingConnections?.includes(patientId)) {
            return { success: false, error: "A connection request has already been sent." };
        }

        // Add to pending connections for both users
        const doctorRef = doc(db, USERS_COLLECTION, doctorId);
        await updateDoc(doctorRef, { pendingConnections: arrayUnion(patientId) });

        const patientRef = doc(db, USERS_COLLECTION, patientId);
        await updateDoc(patientRef, { pendingConnections: arrayUnion(doctorId) });

        return { success: true };
    } catch (error) {
        console.error("Error creating connection request:", error);
        return { success: false, error: "Failed to send connection request." };
    }
}

// Get pending connection requests for a user (can be patient or doctor)
export const getPendingConnections = async (userId: string): Promise<UserDocument[]> => {
    try {
        const userDoc = await getUserDocument(userId);
        if (!userDoc || !userDoc.pendingConnections || userDoc.pendingConnections.length === 0) {
            return [];
        }

        const userIds = userDoc.pendingConnections;
        const usersQuery = query(collection(db, USERS_COLLECTION), where(documentId(), 'in', userIds));
        const querySnapshot = await getDocs(usersQuery);

        return querySnapshot.docs.map(doc => convertTimestamp(doc.data()) as UserDocument);
    } catch (error) {
        console.error("Error getting pending connections:", error);
        return [];
    }
}


// Update the status of a connection request
export const updateUserProfile = async (userId: string, data: Partial<UserDocument>) => {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);

        if (data.weight && data.height) {
            const heightInMeters = data.height / 100;
            data.bmi = parseFloat((data.weight / (heightInMeters * heightInMeters)).toFixed(2));
        }

        await updateDoc(userRef, data);

        // Add a health record for the update
        if (data.weight || data.height) {
            await addHealthRecord(userId, {
                type: 'note',
                title: 'Health Metrics Update',
                content: `Weight: ${data.weight || 'N/A'} kg\nHeight: ${data.height || 'N/A'} cm\nBMI: ${data.bmi || 'N/A'}`,
                date: new Date(),
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Error updating user profile:", error);
        return { success: false, error: 'Failed to update profile.' };
    }
};

// Update the status of a connection request
export const updateConnectionRequest = async (patientId: string, doctorId: string, status: 'approved' | 'denied') => {
    try {
        const patientRef = doc(db, USERS_COLLECTION, patientId);
        const doctorRef = doc(db, USERS_COLLECTION, doctorId);
        
        // Remove from pending for both
        await updateDoc(patientRef, { pendingConnections: arrayRemove(doctorId) });
        await updateDoc(doctorRef, { pendingConnections: arrayRemove(patientId) });

        if (status === 'approved') {
            // Add to successful connections for both
            await updateDoc(patientRef, { successfulConnections: arrayUnion(doctorId) });
            await updateDoc(doctorRef, { successfulConnections: arrayUnion(patientId) });
        }

        return { success: true };
    } catch (error) {
        console.error(`Error updating connection request to ${status}:`, error);
        return { success: false, error: "Failed to update connection request." };
    }
}


// Get a doctor's connected patients
export const getConnectedPatients = async (doctorId: string): Promise<UserDocument[]> => {
    try {
        const doctorDoc = await getUserDocument(doctorId);
        if (!doctorDoc || !doctorDoc.successfulConnections || doctorDoc.successfulConnections.length === 0) {
            return [];
        }

        const patientIds = doctorDoc.successfulConnections;
        const patientsQuery = query(collection(db, USERS_COLLECTION), where(documentId(), 'in', patientIds));
        const querySnapshot = await getDocs(patientsQuery);

        return querySnapshot.docs.map(doc => convertTimestamp(doc.data()) as UserDocument);
    } catch (error) {
        console.error("Error getting connected patients:", error);
        return [];
    }
}

// Get a patient's connected doctors
export const getConnectedDoctors = async (patientId: string): Promise<UserDocument[]> => {
    try {
        const patientDoc = await getUserDocument(patientId);
        if (!patientDoc || !patientDoc.successfulConnections || patientDoc.successfulConnections.length === 0) {
            return [];
        }

        const doctorIds = patientDoc.successfulConnections;
        const doctorsQuery = query(collection(db, USERS_COLLECTION), where(documentId(), 'in', doctorIds));
        const querySnapshot = await getDocs(doctorsQuery);

        return querySnapshot.docs.map(doc => convertTimestamp(doc.data()) as UserDocument);
    } catch (error) {
        console.error("Error getting connected doctors:", error);
        return [];
    }
}

export const addDiagnosisToRecord = async (recordId: string, diagnosis: Omit<Diagnosis, 'createdAt'>) => {
    try {
        const recordRef = doc(db, HEALTH_RECORDS_COLLECTION, recordId);
        const recordSnap = await getDoc(recordRef);
        if (!recordSnap.exists()) {
          return { success: false, error: 'Record not found.' };
        }

        const data = recordSnap.data() as any;
        let decrypted: any = {};
        if (data.encryptedData) {
          decrypted = await decryptObject<any>(data.encryptedData as EncryptedBlob);
        }

        const updatedPayload = {
          ...decrypted,
          diagnosis: {
            ...diagnosis,
            createdAt: new Date().toISOString(),
          },
        };

        const encryptedData = await encryptObject(updatedPayload);
        await updateDoc(recordRef, { encryptedData });
        return { success: true };
    } catch (error) {
        console.error("Error adding diagnosis:", error);
        return { success: false, error: "Failed to add diagnosis." };
    }
};
