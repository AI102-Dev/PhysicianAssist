export interface Ailment {
  id: string; // Added for IndexedDB
  date: string;
  name: string;
  notes: string;
  severity: number; // 1-10 scale
}

export interface Medication {
  id: string; // Added for IndexedDB
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  instructions?: string; // e.g., 'Take with food.'
}

export interface MedicalRecord {
  id: string; // Added for IndexedDB
  date: string;
  type: 'Lab Report' | 'Imaging' | 'Consultation';
  summary: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  bloodType: string;
  allergies: string[];
  pastHistory: Ailment[];
  medications: Medication[];
  medicalRecords: MedicalRecord[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  summary?: string;
  visualizationData?: VisualizationData;
  consultationSummary?: string;
  groundingUrls?: { uri: string; title: string; }[]; // Added for Google Search results
  type?: 'error' | 'info' | 'success' | 'warning'; // Added for semantic styling
}

export interface AilmentVisualization {
  name: string;
  date: string;
  severity: number;
}

export interface MedicationVisualization {
    name: string;
    duration: number; // in days
}

export interface VisualizationData {
  ailmentHistory: AilmentVisualization[];
  medicationSummary: MedicationVisualization[];
}

export interface Insight {
  id: string;
  patientId?: string; // Optional: Link insight to a specific patient
  topic: string;
  content: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  component: string;
  message: string;
  details?: Record<string, any>;
}

export interface Toast {
  message: string;
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
}
