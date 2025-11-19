import type { Patient, Ailment, Medication, MedicalRecord, Insight, LogEntry } from './types';
import { INITIAL_PATIENTS, INITIAL_MOCK_MEDICINE_DATABASE } from './constants';

const DB_NAME = 'aiPhysicianDB';
const DB_VERSION = 1;
const PATIENTS_STORE = 'patients';
const MEDICINES_STORE = 'medicines';
const INSIGHTS_STORE = 'insights'; // New store for long-term memory
const LOGS_STORE = 'logs';         // New store for structured logging

let db: IDBDatabase | null = null;

/**
 * Initializes the IndexedDB database, creating object stores and seeding initial data.
 */
export const initDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(PATIENTS_STORE)) {
        db.createObjectStore(PATIENTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(MEDICINES_STORE)) {
        db.createObjectStore(MEDICINES_STORE, { keyPath: 'name' }); // Medicines indexed by name
      }
      if (!db.objectStoreNames.contains(INSIGHTS_STORE)) {
        const insightStore = db.createObjectStore(INSIGHTS_STORE, { keyPath: 'id' });
        insightStore.createIndex('topic', 'topic', { unique: false });
        insightStore.createIndex('patientId', 'patientId', { unique: false });
      }
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const logStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('level', 'level', { unique: false });
        logStore.createIndex('component', 'component', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDB opened successfully');
      // Seed initial data if stores are empty
      seedInitialData(db).then(() => resolve(db!)).catch(reject);
    };

    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
      reject('IndexedDB error');
    };
  });
};

/**
 * Seeds the database with initial patient and medicine data if the stores are empty.
 * @param db The IndexedDB database instance.
 */
const seedInitialData = async (db: IDBDatabase): Promise<void> => {
  const transaction = db.transaction([PATIENTS_STORE, MEDICINES_STORE], 'readwrite');
  const patientStore = transaction.objectStore(PATIENTS_STORE);
  const medicineStore = transaction.objectStore(MEDICINES_STORE);

  return new Promise((resolve, reject) => {
    const patientCountRequest = patientStore.count();
    patientCountRequest.onsuccess = () => {
      if (patientCountRequest.result === 0) {
        console.log('Seeding initial patients...');
        INITIAL_PATIENTS.forEach(patient => patientStore.add(patient));
      }
    };
    patientCountRequest.onerror = reject;

    const medicineCountRequest = medicineStore.count();
    medicineCountRequest.onsuccess = () => {
      if (medicineCountRequest.result === 0) {
        console.log('Seeding initial medicines...');
        INITIAL_MOCK_MEDICINE_DATABASE.forEach(medicine => medicineStore.add(medicine));
      }
    };
    medicineCountRequest.onerror = reject;

    transaction.oncomplete = () => {
      console.log('Initial data seeding complete (if needed).');
      resolve();
    };
    transaction.onerror = reject;
  });
};

/**
 * Gets all patient records from the database.
 */
export const getAllPatients = async (): Promise<Patient[]> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([PATIENTS_STORE], 'readonly');
    const store = transaction.objectStore(PATIENTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Gets a single patient record by ID.
 * @param id The ID of the patient to retrieve.
 */
export const getPatientById = async (id: string): Promise<Patient | undefined> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([PATIENTS_STORE], 'readonly');
    const store = transaction.objectStore(PATIENTS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Updates an existing patient record or adds a new one.
 * @param patient The patient object to update/add.
 */
export const updatePatient = async (patient: Patient): Promise<Patient> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([PATIENTS_STORE], 'readwrite');
    const store = transaction.objectStore(PATIENTS_STORE);
    const request = store.put(patient); // put() updates if key exists, adds if not

    request.onsuccess = () => resolve(patient);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Gets all medicine records from the database.
 */
export const getAllMedicines = async (): Promise<any[]> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([MEDICINES_STORE], 'readonly');
    const store = transaction.objectStore(MEDICINES_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Searches medicine records by name.
 * @param query The search query string.
 */
export const searchMedicines = async (query: string): Promise<any[]> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([MEDICINES_STORE], 'readonly');
    const store = transaction.objectStore(MEDICINES_STORE);
    const request = store.openCursor();
    const results: any[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.name.toLowerCase().includes(query.toLowerCase())) {
          results.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

/**
 * Saves a new insight to long-term memory.
 */
export const saveInsight = async (insight: Insight): Promise<Insight> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([INSIGHTS_STORE], 'readwrite');
    const store = transaction.objectStore(INSIGHTS_STORE);
    const request = store.add(insight);

    request.onsuccess = () => resolve(insight);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Retrieves insights from long-term memory.
 * Can filter by topic or patientId.
 */
export const getInsights = async (topic?: string, patientId?: string): Promise<Insight[]> => {
  if (!db) await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db!.transaction([INSIGHTS_STORE], 'readonly');
    const store = transaction.objectStore(INSIGHTS_STORE);
    let request: IDBRequest;

    if (patientId && topic) {
      // Both patientId and topic: filter manually after getting all for patient
      const index = store.index('patientId');
      const range = IDBKeyRange.only(patientId);
      request = index.openCursor(range);
      const results: Insight[] = [];
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.topic.toLowerCase().includes(topic.toLowerCase())) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
    } else if (patientId) {
      // Only patientId
      const index = store.index('patientId');
      const range = IDBKeyRange.only(patientId);
      request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
    } else if (topic) {
      // Only topic
      const index = store.index('topic');
      const range = IDBKeyRange.only(topic); // For exact match, or use openCursor for contains
      request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
    } else {
      // No filters, get all insights
      request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    }
    request.onerror = () => reject(request.error);
  });
};

/**
 * Logs an event to the IndexedDB logs store.
 */
export const log = async (
  level: LogEntry['level'],
  component: string,
  message: string,
  details?: Record<string, any>,
): Promise<void> => {
  if (!db) await initDb(); // Ensure DB is open for logging
  return new Promise((resolve, reject) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      details,
    };

    try {
      const transaction = db!.transaction([LOGS_STORE], 'readwrite');
      const store = transaction.objectStore(LOGS_STORE);
      const request = store.add(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to save log entry to IndexedDB:', request.error);
        reject(request.error);
      };
    } catch (e) {
      console.error('Error logging to IndexedDB:', e);
      reject(e);
    }
  });
};