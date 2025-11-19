import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse, Content, Tool } from '@google/genai';
import type { Patient, VisualizationData, ChatMessage } from '../types';
import * as dbService from '../dbService'; // Import dbService for logging

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// Assume this variable is pre-configured, valid, and accessible.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const summaryAndVizSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A concise clinical summary of the patient's health status, key conditions, and recent activities. Max 3-4 sentences."
        },
        visualizationData: {
            type: Type.OBJECT,
            properties: {
                ailmentHistory: {
                    type: Type.ARRAY,
                    description: "An array of the patient's most significant past ailments for visualization.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Name of the ailment." },
                            date: { type: Type.STRING, description: "Date of ailment in YYYY-MM-DD format." },
                            severity: { type: Type.NUMBER, description: "Severity of the ailment on a scale from 1 to 10." }
                        },
                        required: ["name", "date", "severity"]
                    }
                },
                medicationSummary: {
                    type: Type.ARRAY,
                    description: "An array summarizing the patient's key medications and their duration.",
                     items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Name of the medication." },
                            duration: { 
                                type: Type.NUMBER, 
                                description: "Duration of prescription in days. If ongoing, calculate from start date to today. If finished, calculate duration between start and end date." 
                            }
                        },
                        required: ["name", "duration"]
                    }
                }
            },
            required: ["ailmentHistory", "medicationSummary"]
        }
    },
    required: ["summary", "visualizationData"]
};

// All FunctionDeclaration objects
const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'updatePatientRecord',
    description: "Updates a patient's record with a new ailment or medication. Use this to add prescriptions.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        newAilment: {
          type: Type.OBJECT,
          description: "A new ailment to add to the patient's history.",
          properties: {
            date: { type: Type.STRING, description: "Date of onset (YYYY-MM-DD)." },
            name: { type: Type.STRING, description: "Name of the ailment." },
            notes: { type: Type.STRING, description: "Clinical notes about the ailment." },
            severity: { type: Type.NUMBER, description: "Severity from 1 to 10." },
          },
          required: ["date", "name", "notes", "severity"]
        },
        newMedication: {
            type: Type.OBJECT,
            description: "A new medication to prescribe to the patient.",
            properties: {
                name: { type: Type.STRING },
                dosage: { type: Type.STRING },
                frequency: { type: Type.STRING },
                startDate: { type: Type.STRING, description: "Start date (YYYY-MM-DD)." },
                endDate: { type: Type.STRING, description: "Optional end date (YYYY-MM-DD)." },
                instructions: { type: Type.STRING, description: "Optional instructions, e.g. 'Take with food.'" }
            },
            required: ["name", "dosage", "frequency", "startDate"]
        }
      },
    }
  },
  {
      name: 'sendPrescription',
      description: 'Simulates sending a prescription to a pharmacy.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              medicationName: { type: Type.STRING },
              dosage: { type: Type.STRING, description: "Optional: Dosage of the medication." },
              instructions: { type: Type.STRING, description: "Optional: Instructions for the medication." },
              pharmacy: { type: Type.STRING, description: "Name of the pharmacy, e.g., 'Clinic Pharmacy'." },
          },
          required: ["medicationName", "pharmacy"]
      }
  },
  {
      name: 'sendPatientEmail',
      description: 'Simulates sending an email summary to the patient.',
      parameters: {
          type: Type.OBJECT,
          properties: {
              subject: { type: Type.STRING },
              body: { type: Type.STRING, description: "The content of the email." }
          },
          required: ["subject", "body"]
      }
  },
  {
    name: 'searchMedicineDatabase',
    description: "Searches the mock medicine database for information about a specific drug.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: "The name of the medicine to search for."
            }
        },
        required: ["query"]
    }
  },
  {
    name: 'saveInsight',
    description: "Saves a key piece of information or insight for future reference in the long-term memory. Use this for important facts, recurring patterns, or useful advice.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: "A concise topic or category for the insight (e.g., 'migraine triggers', 'diabetes management best practices', 'medical best practices')." },
        content: { type: Type.STRING, description: "The detailed content of the insight to be saved." },
        patientId: { type: Type.STRING, description: "Optional: The ID of the patient this insight relates to, if specific to a patient." },
      },
      required: ["topic", "content"]
    }
  },
  {
    name: 'retrieveInsights',
    description: "Retrieves previously saved insights from long-term memory based on a topic or patient context. Use this when you need to recall information that might have been saved in a previous session.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: "Optional: The topic or category of insights to retrieve." },
        patientId: { type: Type.STRING, description: "Optional: The ID of the patient to retrieve insights for. If not provided, general insights are retrieved." },
      },
      required: []
    }
  },
];

// Fix: Corrected the structure of the tools array
const tools: Tool[] = [
  { functionDeclarations: functionDeclarations }, // Group all function declarations
  { googleSearch: {} } // Built-in Google Search tool
];


export const getPatientSummary = async (patient: Patient): Promise<{ summary: string; visualizationData: VisualizationData }> => {
  const patientDataString = JSON.stringify(patient, null, 2);
  const prompt = `
    Analyze the following patient JSON data. Provide a concise clinical summary and extract structured data for visualization based on the provided schema.
    Today's date is ${new Date().toISOString().split('T')[0]}.

    Patient Data:
    ${patientDataString}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: summaryAndVizSchema
      },
    });

    dbService.log('info', 'geminiService', 'Generated patient summary', { patientId: patient.id, response: response.text });

    const jsonString = response.text.trim();
    const parsed = JSON.parse(jsonString);
    
    return {
      summary: parsed.summary,
      visualizationData: parsed.visualizationData,
    };

  } catch (error) {
    dbService.log('error', 'geminiService', 'Failed to generate patient summary', { patientId: patient.id, error: error instanceof Error ? error.message : String(error) });
    console.error('Error in getPatientSummary:', error);
    throw new Error('Failed to generate patient summary from AI.');
  }
};

export const getNextChatResponse = async (patient: Patient, history: Content[]): Promise<GenerateContentResponse> => {
    const patientDataString = JSON.stringify(patient, null, 2);
    const systemInstruction = `You are a helpful AI assistant for a physician. You are discussing the following patient:
    
    ${patientDataString}
    
    Your role is to answer the physician's questions. Use the provided tools to update records, search the medicine database, simulate actions like sending prescriptions/emails, save/retrieve long-term insights, or perform web searches.
    - When a tool is used successfully, the system will confirm. Briefly acknowledge this confirmation to the user. For example, "Done. The prescription has been sent." or "Okay, I've added that to the patient's record."
    - Do not ask for confirmation before using a tool. If the user's request is clear, use the tool directly.
    - Keep your text responses concise and clinical for patient-related tasks. For general queries, provide brief acknowledgments of using the tool or directly answer.
    - If a query requires up-to-date information not found in the patient data, use the 'googleSearch' tool. Always extract and list the URLs from the search results (grounding chunks).
    - Use 'saveInsight' to store important patient details, common medical advice, or useful general knowledge that might be relevant for future consultations or other users.
    - Use 'retrieveInsights' to recall information you might have previously stored.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: history,
            config: {
                systemInstruction,
                tools: tools, // Pass the combined tools array
            }
        });

        // Fix: Access groundingMetadata via response.candidates[0]
        dbService.log('info', 'geminiService', 'Generated chat response', { patientId: patient.id, query: history[history.length - 1], response: response.text, functionCalls: response.functionCalls, groundingMetadata: response.candidates?.[0]?.groundingMetadata });

        return response;
    } catch (error) {
        dbService.log('error', 'geminiService', 'Failed to get chat response', { patientId: patient.id, error: error instanceof Error ? error.message : String(error) });
        console.error("Error in getNextChatResponse:", error);
        throw new Error("Failed to get response from AI.");
    }
};

export const summarizeConsultation = async (patient: Patient, history: ChatMessage[]): Promise<string> => {
    const conversation = history
        .filter(msg => !msg.summary) // Exclude initial summary message
        .map(msg => `${msg.sender === 'user' ? 'Physician' : 'AI Assistant'}: ${msg.text}`)
        .join('\n');

    const prompt = `Based on the following conversation about patient ${patient.name} (age ${patient.age}), generate a concise clinical consultation summary in SOAP note format (Subjective, Objective, Assessment, Plan).

    Conversation History:
    ${conversation}
    
    SOAP Note:`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        dbService.log('info', 'geminiService', 'Generated consultation summary', { patientId: patient.id, response: response.text });
        return response.text;
    } catch(error) {
        dbService.log('error', 'geminiService', 'Failed to generate consultation summary', { patientId: patient.id, error: error instanceof Error ? error.message : String(error) });
        console.error("Error in summarizeConsultation:", error);
        throw new Error("Failed to generate consultation summary.");
    }
};