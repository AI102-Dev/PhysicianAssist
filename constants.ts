import type { Patient } from './types';

export const INITIAL_PATIENTS: Patient[] = [
  {
    id: 'p001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    pastHistory: [
      { id: 'a001', date: '2023-05-15', name: 'Hypertension', notes: 'Managed with medication.', severity: 6 },
      { id: 'a002', date: '2022-11-20', name: 'Influenza', notes: 'Recovered fully.', severity: 5 },
      { id: 'a003', date: '2021-01-10', name: 'Minor Surgery (Appendix)', notes: 'No complications.', severity: 7 },
      { id: 'a004', date: '2023-08-01', name: 'Common Cold', notes: 'Resolved in a week.', severity: 3 },
    ],
    medications: [
      { id: 'm001', name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', startDate: '2023-05-20', instructions: 'Take in the morning.' },
      { id: 'm002', name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', startDate: '2023-05-20', instructions: 'Take with food.' },
      { id: 'm003', name: 'Amoxicillin', dosage: '500mg', frequency: 'Twice daily', startDate: '2022-11-21', endDate: '2022-11-28' },
    ],
    medicalRecords: [
      { id: 'r001', date: '2023-05-10', type: 'Lab Report', summary: 'Blood pressure reading: 145/92 mmHg. Cholesterol levels normal.' },
      { id: 'r002', date: '2021-01-10', type: 'Consultation', summary: 'Pre-surgery consultation for appendectomy.' },
    ],
  },
  {
    id: 'p002',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    bloodType: 'A-',
    allergies: ['None'],
    pastHistory: [
      { id: 'a005', date: '2023-09-01', name: 'Migraine', notes: 'Recurring, triggered by stress.', severity: 8 },
      { id: 'a006', date: '2022-03-12', name: 'Anemia', notes: 'Iron deficiency, managed with supplements.', severity: 5 },
      { id: 'a007', date: '2023-02-20', name: 'Gastritis', notes: 'Mild, resolved with diet change.', severity: 4 },
    ],
    medications: [
      { id: 'm004', name: 'Sumatriptan', dosage: '50mg', frequency: 'As needed for migraines', startDate: '2023-09-01' },
      { id: 'm005', name: 'Ferrous Sulfate', dosage: '325mg', frequency: 'Once daily', startDate: '2022-03-15', endDate: '2022-09-15', instructions: 'Take on an empty stomach.' },
    ],
    medicalRecords: [
      { id: 'r003', date: '2023-08-25', type: 'Consultation', summary: 'Follow-up for migraine management.' },
      { id: 'r004', date: '2022-03-10', type: 'Lab Report', summary: 'Hemoglobin levels low, confirming anemia.' },
    ],
  },
    {
    id: 'p003',
    name: 'Emily White',
    age: 68,
    gender: 'Female',
    bloodType: 'B+',
    allergies: ['Sulfa drugs'],
    pastHistory: [
      { id: 'a008', date: '2020-06-15', name: 'Type 2 Diabetes', notes: 'Managed with Metformin and diet.', severity: 7 },
      { id: 'a009', date: '2022-08-20', name: 'Arthritis', notes: 'Affects both knees.', severity: 6 },
      { id: 'a010', date: '2023-10-05', name: 'Pneumonia', notes: 'Hospitalized for 3 days, recovered.', severity: 9 },
    ],
    medications: [
      { id: 'm006', name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', startDate: '2020-06-20', instructions: 'Take with meals.' },
      { id: 'm007', name: 'Ibuprofen', dosage: '400mg', frequency: 'As needed for pain', startDate: '2022-08-20' },
      { id: 'm008', name: 'Atorvastatin', dosage: '20mg', frequency: 'Once daily', startDate: '2021-01-01' },
    ],
    medicalRecords: [
      { id: 'r005', date: '2023-10-05', type: 'Imaging', summary: 'Chest X-ray confirmed pneumonia.' },
      { id: 'r006', date: '2023-09-15', type: 'Lab Report', summary: 'HbA1c level at 7.2%.' },
    ],
  },
];

// Mock database of medicines for the new search tool
export const INITIAL_MOCK_MEDICINE_DATABASE = [
    { name: 'Lisinopril', description: 'Used to treat high blood pressure.', commonDosages: ['10mg', '20mg', '40mg'] },
    { name: 'Metformin', description: 'Used to control blood sugar levels in type 2 diabetes.', commonDosages: ['500mg', '850mg', '1000mg'] },
    { name: 'Atorvastatin', description: 'Used to lower cholesterol.', commonDosages: ['10mg', '20mg', '40mg', '80mg'] },
    { name: 'Amoxicillin', description: 'An antibiotic used to treat bacterial infections.', commonDosages: ['250mg', '500mg', '875mg'] },
    { name: 'Ibuprofen', description: 'A nonsteroidal anti-inflammatory drug (NSAID) used for pain relief.', commonDosages: ['200mg', '400mg', '600mg', '800mg'] },
    { name: 'Sumatriptan', description: 'Used to treat migraines.', commonDosages: ['25mg', '50mg', '100mg'] },
    { name: 'Ferrous Sulfate', description: 'An iron supplement used to treat anemia.', commonDosages: ['325mg'] },
    { name: 'Omeprazole', description: 'Used to treat heartburn, GERD, and stomach ulcers.', commonDosages: ['20mg', '40mg'] },
    { name: 'Losartan', description: 'Used to treat high blood pressure.', commonDosages: ['25mg', '50mg', '100mg'] },
];