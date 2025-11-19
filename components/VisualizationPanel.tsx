
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Patient } from '../types';

interface VisualizationPanelProps {
  patient: Patient;
}

const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ patient }) => {
  const { pastHistory, medications } = patient;

  const ailmentData = pastHistory.map(a => ({ name: a.name, severity: a.severity, date: a.date })).slice(-5); // show last 5
    
  const medicationData = medications.map(m => {
      const startDate = new Date(m.startDate);
      const endDate = m.endDate ? new Date(m.endDate) : new Date();
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { name: m.name, duration: diffDays };
  }).slice(-5); // show last 5

  return (
    <div className="space-y-8">
      <div>
        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Ailment History (Severity)</h4>
        <div className="w-full h-64 bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
            {ailmentData && ailmentData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ailmentData}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis type="number" domain={[0, 10]} tick={{ fill: '#a0aec0' }} />
              <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#a0aec0', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ 
                    backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                    borderColor: '#4a5568', 
                    color: '#e2e8f0' 
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              <Bar dataKey="severity" fill="#3b82f6" name="Severity (1-10)" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
            ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    No ailment data to display.
                </div>
            )}
        </div>
      </div>
      <div>
        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Medication Duration (Days)</h4>
        <div className="w-full h-64 bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          {medicationData && medicationData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={medicationData}
                margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" angle={-20} textAnchor="end" height={50} tick={{ fill: '#a0aec0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0aec0' }} />
                <Tooltip
                  contentStyle={{ 
                      backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                      borderColor: '#4a5568', 
                      color: '#e2e8f0' 
                  }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="duration" fill="#10b981" name="Duration (days)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No medication data to display.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualizationPanel;