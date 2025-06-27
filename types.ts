import firebase from 'firebase/compat/app'; // Import for firebase.User
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export interface ApiKeys {
  openai: string;
  claude: string;
  gemini: string;
}

// Ensure LLMProvider includes all expected providers
export type LLMProvider = 'openai' | 'claude' | 'gemini';

export interface AppUser extends firebase.User {}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot' | 'system' | 'error';
  timestamp: Date;
  provider?: LLMProvider; // Optional: to know which LLM generated the message
}

export type MCPConnectionStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'error';

export interface MCPServer {
  id: string;
  name: string;
  url: string;
  bearerToken?: string;
  status: MCPConnectionStatus;
  statusMessage: string;
  // Add client and transport instances
  client?: Client;
  transport?: StreamableHTTPClientTransport;
}

export interface LLMChatProps {
  apiKeys: ApiKeys;
  activeProvider: LLMProvider;
  mcpServers: MCPServer[];
  keysLoadedFromStorage: boolean;
  langchainAgent: ReturnType<typeof createReactAgent> | null;
  activeLLMService: LLMService | null; // Add the new prop
}

export interface LLMService {
  generateText(prompt: string, apiKey: string | undefined): Promise<string>;
  generateTextStream?(prompt: string, apiKey: string | undefined, onChunk: (text: string) => void, onComplete: () => void, onError: (errorMsg: string) => void): Promise<void>;
  isAvailable(apiKey: string | undefined): boolean;
}

declare global {
  interface Window {
    firebaseui?: any; 
  }
  namespace NodeJS {
    interface ProcessEnv {
      // API_KEY?: string; 
    }
  }
}