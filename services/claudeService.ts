import { LLMService } from '../types'; 




const isClaudeEffectivelyAvailable = (apiKey: string | undefined): boolean => {
  return !!apiKey && apiKey.trim() !== '';
};

const generateClaudeText = async (prompt: string, apiKey: string | undefined): Promise<string> => {
  if (!isClaudeEffectivelyAvailable(apiKey)) {
    return "Claude API is not available. Please ensure API Key is configured.";
  }
  
  
  await new Promise(resolve => setTimeout(resolve, 1000)); 
  return `(Stubbed Claude Response) You said: "${prompt}". This function is a placeholder.`;
};


const generateClaudeTextStream = async (
  prompt: string,
  apiKey: string | undefined,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (errorMsg: string) => void
): Promise<void> => {
  if (!isClaudeEffectivelyAvailable(apiKey)) {
    onError("Claude API is not available. Please ensure API Key is configured.");
    onComplete();
    return;
  }
  onChunk(`(Stubbed Claude Stream) You said: "${prompt}". `);
  await new Promise(resolve => setTimeout(resolve, 500));
  onChunk("This function is a placeholder.");
  onComplete();
};


export const claudeService: LLMService = {
  generateText: generateClaudeText,
  generateTextStream: generateClaudeTextStream,
  isAvailable: isClaudeEffectivelyAvailable,
};
