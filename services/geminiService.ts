import { GoogleGenAI, GenerateContentResponse, Part, Content } from "@google/genai";
import { GEMINI_API_MODEL } from '../constants';
import { LLMService } from '../types'; // Import the new interface

// Removed global 'ai' instance. Each call will get a fresh client or use a short-lived one.

const getGenAIClient = (apiKey: string): GoogleGenAI | null => {
  if (!apiKey || apiKey.trim() === '') {
    // console.warn("Attempted to get Gemini client with an empty API key.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI with provided key:", error);
    return null;
  }
};

export const isGeminiEffectivelyAvailable = (apiKey: string | undefined): boolean => {
  return !!apiKey && apiKey.trim() !== '';
};

export const generateGeminiText = async (prompt: string, apiKey: string | undefined): Promise<string> => {
  if (!isGeminiEffectivelyAvailable(apiKey)) {
    return "Gemini API is not available. Please ensure API Key is configured in API Key Management.";
  }
  
  // apiKey is now guaranteed to be a non-empty string due to the check above
  const genAIInstance = getGenAIClient(apiKey as string); 
  if (!genAIInstance) {
    return "Gemini API client could not be initialized. Check console for details (e.g., invalid API key format).";
  }

  try {
    const contents: Content[] = [{ role: "user", parts: [{ text: prompt }] }];

    const response: GenerateContentResponse = await genAIInstance.models.generateContent({
      model: GEMINI_API_MODEL,
      contents: contents,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    if (error instanceof Error) {
        // Check for common API key related errors if possible, e.g. from error.message or error.code
        if (error.message.includes("API key not valid")) {
            return "Error from Gemini: API key not valid. Please check your Gemini API key.";
        }
        return `Error from Gemini: ${error.message}`;
    }
    return "An unknown error occurred while contacting Gemini.";
  }
};

export const generateGeminiTextStream = async (
  prompt: string, 
  apiKey: string | undefined,
  onChunk: (text: string) => void, 
  onComplete: () => void, 
  onError: (errorMsg: string) => void
): Promise<void> => {
  if (!isGeminiEffectivelyAvailable(apiKey)) {
    onError("Gemini API is not available. Please ensure API Key is configured in API Key Management.");
    onComplete();
    return;
  }

  const genAIInstance = getGenAIClient(apiKey as string);
  if (!genAIInstance) {
    onError("Gemini API client could not be initialized. Check console for details (e.g., invalid API key format).");
    onComplete();
    return;
  }

  try {
    const contents: Content[] = [{ role: "user", parts: [{text: prompt}] }];
    const stream = await genAIInstance.models.generateContentStream({
        model: GEMINI_API_MODEL,
        contents: contents,
    });
    for await (const chunk of stream) {
        onChunk(chunk.text);
    }
  } catch (error) {
    console.error("Error generating streaming text with Gemini:", error);
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            onError("Error from Gemini: API key not valid. Please check your Gemini API key.");
        } else {
            onError(`Error from Gemini: ${error.message}`);
        }
    } else {
        onError("An unknown error occurred while contacting Gemini.");
    }
  } finally {
    onComplete();
  }
};

// Create and export the LLMService implementation for Gemini
export const geminiService: LLMService = {
  generateText: generateGeminiText,
  generateTextStream: generateGeminiTextStream,
  isAvailable: isGeminiEffectivelyAvailable,
};