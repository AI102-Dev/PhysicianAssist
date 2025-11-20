import React, { useState, useCallback, useEffect } from 'react';
import type { Ailment } from '../types';
import { EditIcon, SaveIcon, XIcon } from './icons';

interface AilmentNotesEditorProps {
  patientAilments: Ailment[];
  onUpdateAilmentNote: (ailmentId: string, newNotes: string) => void;
  isLoading: boolean;
}

const AilmentNotesEditor: React.FC<AilmentNotesEditorProps> = ({ patientAilments, onUpdateAilmentNote, isLoading }) => {
  const [editingAilmentId, setEditingAilmentId] = useState<string | null>(null);
  const [currentNotes, setCurrentNotes] = useState<string>('');

  // Reset editing state if patient ailments change (e.g., new patient selected)
  useEffect(() => {
    setEditingAilmentId(null);
    setCurrentNotes('');
  }, [patientAilments]);

  const handleEditClick = useCallback((ailment: Ailment) => {
    setEditingAilmentId(ailment.id);
    setCurrentNotes(ailment.notes);
  }, []);

  const handleSaveClick = useCallback(async () => {
    if (editingAilmentId && currentNotes.trim() !== '') {
      await onUpdateAilmentNote(editingAilmentId, currentNotes);
      setEditingAilmentId(null);
      setCurrentNotes('');
    }
  }, [editingAilmentId, currentNotes, onUpdateAilmentNote]);

  const handleCancelClick = useCallback(() => {
    setEditingAilmentId(null);
    setCurrentNotes('');
  }, []);

  return (
    <div className="mt-8">
      <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Patient Ailment Notes</h4>
      <div className="space-y-4">
        {patientAilments.length > 0 ? (
          patientAilments.map((ailment) => (
            <div key={ailment.id} className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-bold text-gray-800 dark:text-gray-200">{ailment.name}</h5>
                {editingAilmentId !== ailment.id ? (
                  <button
                    onClick={() => handleEditClick(ailment)}
                    disabled={isLoading}
                    className="p-1 rounded-full text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={`Edit notes for ${ailment.name}`}
                  >
                    <EditIcon className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveClick}
                      disabled={isLoading || currentNotes.trim() === ''}
                      className="p-1 rounded-full text-green-500 hover:bg-green-100 dark:hover:bg-green-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Save notes for ${ailment.name}`}
                    >
                      <SaveIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={handleCancelClick}
                      disabled={isLoading}
                      className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Cancel editing notes for ${ailment.name}`}
                    >
                      <XIcon className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
              {editingAilmentId === ailment.id ? (
                <textarea
                  value={currentNotes}
                  onChange={(e) => setCurrentNotes(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label={`Editing notes for ${ailment.name}`}
                />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ailment.notes || 'No notes available.'}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No ailments recorded.</p>
        )}
      </div>
    </div>
  );
};

export default AilmentNotesEditor;