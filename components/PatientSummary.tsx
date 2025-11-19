
import React from 'react';

interface PatientSummaryProps {
  summary: string;
}

const PatientSummary: React.FC<PatientSummaryProps> = ({ summary }) => {
  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 text-sm">
        <h4 className="font-semibold mb-2 text-gray-800 dark:text-gray-200">Patient Summary:</h4>
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {summary}
        </p>
    </div>
  );
};

export default PatientSummary;
