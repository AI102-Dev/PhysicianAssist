
import React, { useState } from 'react';
import type { Patient } from '../types';
import { UserIcon, SearchIcon } from './icons';

interface SidebarProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ patients, selectedPatient, onSelectPatient }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Patients</h2>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-gray-800 dark:text-gray-200"
          />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2">
          {filteredPatients.map((patient) => (
            <li key={patient.id}>
              <button
                onClick={() => onSelectPatient(patient)}
                className={`w-full text-left flex items-center p-3 rounded-md transition-colors duration-200 ${
                  selectedPatient?.id === patient.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <UserIcon className="h-5 w-5 mr-3 flex-shrink-0" />
                <span className="font-medium">{patient.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;