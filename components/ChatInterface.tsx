import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Patient, ChatMessage, Ailment, Medication, Insight, Toast } from '../types';
import { getPatientSummary, getNextChatResponse, summarizeConsultation } from '../services/geminiService';
import * as dbService from '../dbService';
import { SendIcon, LoadingIcon, UserIcon, BotIcon, FileTextIcon, AlertCircleIcon } from './icons';
import PatientSummary from './PatientSummary';
import VisualizationPanel from './VisualizationPanel';
import AilmentNotesEditor from './AilmentNotesEditor'; // Import new component
import type { Content } from '@google/genai';

interface ChatInterfaceProps {
  patient: Patient;
  onPatientUpdate: (updatedPatient: Patient) => void; // Callback to update patient in App.tsx and DB
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ patient, onPatientUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionPatient, setSessionPatient] = useState<Patient>(patient); // Local state for patient data
  const [toast, setToast] = useState<Toast | null>(null);
  const [currentConsultationSummary, setCurrentConsultationSummary] = useState<string | null>(null); // New state for consultation summary
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Effect 1: Update `sessionPatient` whenever the `patient` prop changes.
  // This ensures `sessionPatient` always reflects the latest state passed from `App.tsx`,
  // including minor updates to the current patient (e.g., notes).
  useEffect(() => {
    setSessionPatient(patient);
  }, [patient]); // Depend on the patient object reference

  // Effect 2: Initialize or reset chat state when a NEW patient is selected (i.e., patient.id changes).
  // This prevents clearing existing chat messages when only an attribute of the current patient changes.
  useEffect(() => {
    // Only run if the patient.id has actually changed, or on initial mount.
    // This will clear messages and fetch initial summary for a *new* patient.
    setMessages([]); // Clear messages for the previous patient
    setCurrentConsultationSummary(null); // Clear summary for the previous patient

    const loadInitialSummary = async () => {
      setIsLoading(true);
      dbService.log('info', 'ChatInterface', 'Initializing chat for new patient', { patientId: patient.id });
      try {
        const { summary } = await getPatientSummary(patient);
        setMessages([
          {
            id: 'summary-0',
            sender: 'ai',
            text: `Starting consultation for ${patient.name}.`,
            summary: summary,
            type: 'info',
          },
        ]);
        dbService.log('info', 'ChatInterface', 'Initial patient summary loaded for new patient', { patientId: patient.id });
      } catch (error) {
        dbService.log('error', 'ChatInterface', 'Failed to load initial patient summary for new patient', { patientId: patient.id, error: error instanceof Error ? error.message : String(error) });
        console.error(error);
        setMessages([
          {
            id: 'error-0',
            sender: 'ai',
            text: 'Error: Could not load patient summary.',
            type: 'error',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialSummary();
    
  }, [patient.id]); // Crucially, depend only on patient.id

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToast({ message, id, type });
    setTimeout(() => {
        setToast((currentToast) => (currentToast?.id === id ? null : currentToast));
    }, 3000);
    dbService.log(type === 'error' ? 'error' : 'info', 'ChatInterface', 'Toast displayed', { message, type });
  }, []);

  const handleUpdateAilmentNote = useCallback(async (ailmentId: string, newNotes: string) => {
    setIsLoading(true);
    dbService.log('info', 'ChatInterface', 'Attempting to update ailment notes from UI', { patientId: patient.id, ailmentId, newNotes });

    try {
      const updatedPatient = { 
        ...sessionPatient, 
        pastHistory: sessionPatient.pastHistory.map(ailment => 
          ailment.id === ailmentId ? { ...ailment, notes: newNotes } : ailment
        )
      };
      
      setSessionPatient(updatedPatient);
      await onPatientUpdate(updatedPatient); // Persist to IndexedDB

      showToast(`Notes for ailment "${updatedPatient.pastHistory.find(a => a.id === ailmentId)?.name || ailmentId}" updated successfully.`, 'success');
      dbService.log('info', 'ChatInterface', 'Ailment notes updated successfully from UI', { patientId: patient.id, ailmentId, newNotes });

    } catch (error) {
      dbService.log('error', 'ChatInterface', 'Failed to update ailment notes from UI', { patientId: patient.id, ailmentId, newNotes, error: error instanceof Error ? error.message : String(error) });
      console.error("Error updating ailment notes from UI:", error);
      showToast("Error updating ailment notes.", 'error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionPatient, onPatientUpdate, showToast, patient.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput: ChatMessage = { id: crypto.randomUUID(), sender: 'user', text: input };
    setMessages((prev) => [...prev, userInput]);
    setInput('');
    setIsLoading(true);
    dbService.log('info', 'ChatInterface', 'User message sent', { patientId: patient.id, message: userInput.text });

    const history: Content[] = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));
    history.push({ role: 'user', parts: [{ text: input }] });

    try {
        let response = await getNextChatResponse(sessionPatient, history);
        
        // Loop to handle potential chained function calls
        while (response.functionCalls && response.functionCalls.length > 0) {
            const functionCalls = response.functionCalls;
            const functionResponses: Content[] = [];

            dbService.log('info', 'ChatInterface', 'AI requested function calls', { patientId: patient.id, functionCalls });

            for (const fc of functionCalls) {
                let toolResult: any = { result: "OK" }; // Default success

                switch (fc.name) {
                    case 'updatePatientRecord':
                        const { newAilment, newMedication, updatedAilment, updatedMedication } = fc.args as { 
                          newAilment?: Ailment, 
                          newMedication?: Medication,
                          updatedAilment?: Partial<Ailment> & { id: string }, // ID is required for update
                          updatedMedication?: Partial<Medication> & { id: string } // ID is required for update
                        };
                        
                        let updatedPatient = { ...sessionPatient };

                        if (newAilment) {
                            const ailmentWithId = { ...newAilment, id: crypto.randomUUID() };
                            updatedPatient = { ...updatedPatient, pastHistory: [...updatedPatient.pastHistory, ailmentWithId]};
                            showToast(`Ailment "${ailmentWithId.name}" added to patient record.`, 'success');
                            dbService.log('info', 'ChatInterface', 'Patient record updated with new ailment', { patientId: patient.id, ailment: ailmentWithId });
                        }
                        if (newMedication) {
                            const medicationWithId = { ...newMedication, id: crypto.randomUUID() };
                            updatedPatient = { ...updatedPatient, medications: [...updatedPatient.medications, medicationWithId]};
                            showToast(`Medication "${medicationWithId.name}" added to patient record.`, 'success');
                            dbService.log('info', 'ChatInterface', 'Patient record updated with new medication', { patientId: patient.id, medication: medicationWithId });
                        }
                        if (updatedAilment) {
                            updatedPatient = { 
                                ...updatedPatient, 
                                pastHistory: updatedPatient.pastHistory.map(ailment => 
                                    ailment.id === updatedAilment.id ? { ...ailment, ...updatedAilment } : ailment
                                )
                            };
                            showToast(`Ailment "${updatedAilment.name || updatedAilment.id}" updated in patient record.`, 'success');
                            dbService.log('info', 'ChatInterface', 'Patient record updated with existing ailment modification', { patientId: patient.id, ailment: updatedAilment });
                        }
                        if (updatedMedication) {
                          updatedPatient = {
                              ...updatedPatient,
                              medications: updatedPatient.medications.map(med =>
                                  med.id === updatedMedication.id ? { ...med, ...updatedMedication } : med
                              )
                          };
                          showToast(`Medication "${updatedMedication.name || updatedMedication.id}" updated in patient record.`, 'success');
                          dbService.log('info', 'ChatInterface', 'Patient record updated with existing medication modification', { patientId: patient.id, medication: updatedMedication });
                        }
                        
                        setSessionPatient(updatedPatient);
                        onPatientUpdate(updatedPatient); // Persist to IndexedDB via App.tsx callback
                        break;
                    case 'sendPrescription':
                        const { medicationName, pharmacy, dosage, instructions } = fc.args as { medicationName: string, pharmacy: string, dosage?: string, instructions?: string };
                        const dosageStr = dosage ? ` (${dosage})` : '';
                        const instructionsStr = instructions ? ` with instructions "${instructions}"` : '';
                        showToast(`Prescription for ${medicationName}${dosageStr} sent to ${pharmacy}${instructionsStr}.`, 'success');
                        dbService.log('info', 'ChatInterface', 'Prescription sent (simulated)', { patientId: patient.id, medicationName, dosage, instructions, pharmacy });
                        break;
                    case 'sendPatientEmail':
                         const { subject, body } = fc.args as { subject: string, body: string };
                         showToast(`Email with subject "${subject}" sent to patient.`, 'success');
                         dbService.log('info', 'ChatInterface', 'Patient email sent (simulated)', { patientId: patient.id, subject, body });
                        break;
                    case 'searchMedicineDatabase':
                        const { query } = fc.args as { query: string };
                        const results = await dbService.searchMedicines(query);
                        toolResult = { result: JSON.stringify(results, null, 2) };
                        showToast(`Searched for "${query}" in medicine database.`, 'info');
                        dbService.log('info', 'ChatInterface', 'Medicine database searched', { patientId: patient.id, query, resultsCount: results.length });
                        break;
                    case 'saveInsight':
                        const { topic, content, patientId: insightPatientId } = fc.args as { topic: string, content: string, patientId?: string };
                        const newInsight: Insight = {
                            id: crypto.randomUUID(),
                            topic,
                            content,
                            patientId: insightPatientId || patient.id, // Default to current patient if not specified
                            timestamp: new Date().toISOString(),
                        };
                        await dbService.saveInsight(newInsight);
                        showToast(`Insight "${topic}" saved to long-term memory.`, 'success');
                        dbService.log('info', 'ChatInterface', 'Insight saved', { insight: newInsight });
                        toolResult = { result: `Insight '${topic}' saved successfully.` };
                        break;
                    case 'retrieveInsights':
                        const { topic: retrieveTopic, patientId: retrievePatientId } = fc.args as { topic?: string, patientId?: string };
                        const retrievedInsights = await dbService.getInsights(retrieveTopic, retrievePatientId);
                        toolResult = { result: retrievedInsights.length > 0 ? JSON.stringify(retrievedInsights, null, 2) : "No insights found." };
                        showToast(`Retrieved ${retrievedInsights.length} insights.`, 'info');
                        dbService.log('info', 'ChatInterface', 'Insights retrieved', { topic: retrieveTopic, patientId: retrievePatientId, count: retrievedInsights.length });
                        break;
                    default:
                        console.warn(`Unknown function call: ${fc.name}`);
                        dbService.log('warn', 'ChatInterface', `Unknown function call: ${fc.name}`, { functionCall: fc });
                        toolResult = { result: "Unknown function" };
                        showToast("Unknown function call requested by AI.", "error"); // Show error toast for unknown function
                }

                functionResponses.push({
                    role: 'tool',
                    parts: [{ functionResponse: { name: fc.name, response: toolResult } }]
                });
            }

            // Append tool calls and responses to history for the next turn
            history.push({ role: 'model', parts: functionCalls.map(fc => ({ functionCall: fc })) });
            history.push(...functionResponses);
            response = await getNextChatResponse(sessionPatient, history); // Get next response with updated history
        }

      console.log("AI Response Object after tool execution and potential re-prompt:", response);
      if (!response.text) {
          dbService.log('warn', 'ChatInterface', 'AI final text response was empty after tool execution.', { patientId: patient.id, originalResponse: response });
      }

      const aiResponse: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: response.text || "I have processed your request.", // Fallback text
        // Fix: Access groundingMetadata via response.candidates[0]
        groundingUrls: response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.filter(chunk => (chunk as any).web) // Filter for web grounding chunks
            .map(chunk => ({ uri: (chunk as any).web.uri, title: (chunk as any).web.title })),
        type: 'info', // Default type for successful AI responses
      };
      setMessages((prev) => [...prev, aiResponse]);
      dbService.log('info', 'ChatInterface', 'AI final response received', { patientId: patient.id, response: aiResponse.text });

    } catch (error) {
      dbService.log('error', 'ChatInterface', 'Error during chat interaction', { patientId: patient.id, error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined, fullError: error });
      console.error("Full error in handleSendMessage:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: `Oops! Something went wrong: ${errorMessage}. Please try rephrasing your request, or report this issue if it persists.`,
        type: 'error',
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEndConsultation = async () => {
    setIsLoading(true);
    dbService.log('info', 'ChatInterface', 'Ending consultation and generating summary', { patientId: patient.id });
    try {
        const summaryText = await summarizeConsultation(sessionPatient, messages);
        const summaryMessage: ChatMessage = {
            id: crypto.randomUUID(),
            sender: 'ai',
            text: "Consultation summary generated.",
            consultationSummary: summaryText,
            type: 'success',
        };
        setMessages(prev => [...prev, summaryMessage]);
        setCurrentConsultationSummary(summaryText); // Update the state for the aside panel
        dbService.log('info', 'ChatInterface', 'Consultation summary generated successfully', { patientId: patient.id });
    } catch (error) {
         dbService.log('error', 'ChatInterface', 'Error generating consultation summary', { patientId: patient.id, error: error instanceof Error ? error.message : String(error) });
         console.error(error);
         showToast("Error generating consultation summary.", "error");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
              {msg.sender === 'ai' && msg.type !== 'error' && <BotIcon className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />}
              {msg.sender === 'ai' && msg.type === 'error' && <AlertCircleIcon className="h-8 w-8 text-red-500 flex-shrink-0 mt-1" />}
              <div 
                className={`max-w-xl rounded-lg p-3 ${
                  msg.sender === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : msg.type === 'error' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                 {msg.summary && <PatientSummary summary={msg.summary} />}
                 {msg.consultationSummary && (
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">SOAP Note Summary</h4>
                        <pre className="text-xs whitespace-pre-wrap font-sans bg-gray-100 dark:bg-gray-800 p-2 rounded text-gray-700 dark:text-gray-300">{msg.consultationSummary}</pre>
                    </div>
                 )}
                 {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                        <h4 className="font-bold mb-2 text-gray-800 dark:text-gray-200">Sources:</h4>
                        <ul className="list-disc list-inside text-xs text-gray-700 dark:text-gray-300">
                            {msg.groundingUrls.map((url, i) => (
                                <li key={i}>
                                    <a 
                                        href={url.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-500 hover:underline dark:text-blue-400"
                                    >
                                        {url.title || url.uri}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                 )}
              </div>
              {msg.sender === 'user' && <UserIcon className="h-8 w-8 text-gray-500 flex-shrink-0 mt-1" />}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
          <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <button
                type="button"
                onClick={handleEndConsultation}
                disabled={isLoading || messages.length < 2}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="End and Summarize Consultation"
            >
                <FileTextIcon className="h-6 w-6"/>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${patient.name} or general info...`}
              className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-800 dark:text-gray-200"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {isLoading ? <LoadingIcon className="h-6 w-6" /> : <SendIcon className="h-6 w-6" />}
            </button>
          </form>
        </div>
      </div>
      <aside className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/50">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Clinical Overview</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            <p><span className="font-semibold">Patient:</span> {sessionPatient.name}</p>
            <p><span className="font-semibold">Age:</span> {sessionPatient.age}</p>
            <p><span className="font-semibold">Allergies:</span> {sessionPatient.allergies.join(', ') || 'None'}</p>
        </div>
        <VisualizationPanel patient={sessionPatient} />
        <AilmentNotesEditor 
          patientAilments={sessionPatient.pastHistory} 
          onUpdateAilmentNote={handleUpdateAilmentNote} 
          isLoading={isLoading}
        />
        {currentConsultationSummary && (
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Latest Consultation Summary</h4>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                    <pre className="text-sm whitespace-pre-wrap font-sans text-gray-800 dark:text-gray-200">{currentConsultationSummary}</pre>
                </div>
            </div>
        )}
      </aside>
       {toast && (
            <div className={`absolute top-20 right-6 py-2 px-4 rounded-lg shadow-lg animate-fade-in-out
                ${toast.type === 'error' ? 'bg-red-500 text-white' : 
                  toast.type === 'warning' ? 'bg-yellow-500 text-black' : 
                  toast.type === 'info' ? 'bg-blue-500 text-white' : 
                  'bg-green-500 text-white'}`}>
                {toast.message}
            </div>
        )}
    </div>
  );
};

export default ChatInterface;