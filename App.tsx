import React, { useState, useCallback, useEffect } from 'react';
import type { Patient } from './types';
import * as dbService from './dbService'; // Import the new dbService
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import { LoadingIcon } from './components/icons';

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(true);

  // Initialize DB and load patients
  useEffect(() => {
    const loadPatients = async () => {
      setIsLoadingDb(true);
      try {
        await dbService.initDb();
        const loadedPatients = await dbService.getAllPatients();
        setPatients(loadedPatients);
        if (loadedPatients.length > 0) {
          setSelectedPatient(loadedPatients[0]);
        }
      } catch (error) {
        console.error("Failed to load patients from DB:", error);
      } finally {
        setIsLoadingDb(false);
      }
    };
    loadPatients();
  }, []);

  const handleSelectPatient = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
  }, []);

  // Function to update patient in DB and local state (passed to ChatInterface)
  const updatePatientInApp = useCallback(async (updatedPatient: Patient) => {
    try {
      await dbService.updatePatient(updatedPatient);
      setPatients(prevPatients => 
        prevPatients.map(p => (p.id === updatedPatient.id ? updatedPatient : p))
      );
      setSelectedPatient(updatedPatient); // Ensure selected patient is also updated
    } catch (error) {
      console.error("Failed to update patient in DB:", error);
    }
  }, []);

  if (isLoadingDb) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <LoadingIcon className="h-10 w-10 text-blue-500 animate-spin" />
        <span className="ml-3 text-lg text-gray-700 dark:text-gray-300">Loading patient data...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          patients={patients} 
          selectedPatient={selectedPatient} 
          onSelectPatient={handleSelectPatient} 
        />
        <main className="flex-1 flex flex-col bg-white dark:bg-gray-800">
          {selectedPatient ? (
            <ChatInterface 
              key={selectedPatient.id} 
              patient={selectedPatient} 
              onPatientUpdate={updatePatientInApp} // Pass the update function
            />
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Select a patient to begin.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;