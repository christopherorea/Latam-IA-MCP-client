import React, { useState, useEffect, useMemo } from 'react';
import { ApiKeys, LLMProvider, LLMService } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import ApiKeyManager from './components/ApiKeyManager';
import ServerConnection from './components/ServerConnection';
import LLMChat from './components/LLMChat';
import { LoadingSpinnerIcon } from './constants';
import { convertMcpToLangchainTools } from "@h1deya/langchain-mcp-tools";

// Import specific Langchain LLM integrations
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// Import refactored LLM services
import { geminiService } from './services/geminiService';
import { openAIService } from './services/openaiService';
import { claudeService } from './services/claudeService';

// Import the custom hook for MCP servers
import { useMcpServers } from './hooks/useMcpServers';
import { useAuth } from './hooks/useAuth';
import { createReactAgent } from "@langchain/langgraph/prebuilt";

const LOCAL_STORAGE_API_KEYS = 'mcpLlmClientApiKeys';

const App: React.FC = () => {
  const { user, loadingAuth, signOut } = useAuth();

  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai: '', claude: '', gemini: '' });
  const [activeLLMProvider, setActiveLLMProvider] = useState<LLMProvider>('gemini');
  const [activeLLMService, setActiveLLMService] = useState<LLMService | null>(geminiService);

  // Re-introduce keysLoadedFromStorage state
  const [keysLoadedFromStorage, setKeysLoadedFromStorage] = useState<boolean>(false);

  // Use the custom hook for MCP server logic
  const { 
    mcpServers,
    serversLoadedFromStorage,
    handleAddServer,
    handleRemoveServer,
    handleConnectToServer,
    mcpCleanup, // Descomentado: Necesitamos exponerlo aquí para la limpieza final
    mcpServerConfig,
    // connectedServersVersion, // Ya no necesitamos importar este valor
    stableConnectedServerConfig, // <-- Add this line
  } = useMcpServers({});

  // Langchain agent state remains here as it depends on both LLM service and MCP servers
  const [langchainAgent, setLangchainAgent] = useState<ReturnType<typeof createReactAgent> | null>(null);
  // Estado para almacenar la función de limpieza del agente/tools
  const [agentCleanup, setAgentCleanup] = useState<any>(undefined);

  // Unique config key for agent
  const agentConfigKey = useMemo(() => JSON.stringify({
    provider: activeLLMProvider,
    apiKeys,
    connectedServers: stableConnectedServerConfig,
  }), [activeLLMProvider, apiKeys, stableConnectedServerConfig]);

  // Initialize Langchain agent when config changes
  useEffect(() => {
    // Las condiciones de carga y LLM activo siguen siendo necesarias
    if (!serversLoadedFromStorage || !keysLoadedFromStorage || !activeLLMService) {
       setLangchainAgent(null);
       // Limpiar agente y cleanup si no se cumplen las condiciones
       setAgentCleanup(undefined);
       return;
    }

    // Parsear la configuración stringificada desde la clave para verificar si hay servidores conectados
    const currentAgentConfig = JSON.parse(agentConfigKey);
    if (Object.keys(currentAgentConfig.connectedServers).length === 0) {
      setLangchainAgent(null);
      // Limpiar agente y cleanup si no hay servers conectados
      setAgentCleanup(undefined);
      return;
    }

    let cancelled = false;
    const initializeAgent = async () => {
      try {
        // Usamos la configuración parseada para obtener el LLM y las tools
        let llmInstance = null;
        switch (currentAgentConfig.provider) {
          case 'openai':
            if (currentAgentConfig.apiKeys.openai) llmInstance = new ChatOpenAI({ apiKey: currentAgentConfig.apiKeys.openai });
            break;
          case 'claude':
            if (currentAgentConfig.apiKeys.claude) llmInstance = new ChatAnthropic({ apiKey: currentAgentConfig.apiKeys.claude });
            break;
          case 'gemini':
            if (currentAgentConfig.apiKeys.gemini) llmInstance = new ChatGoogleGenerativeAI({ apiKey: currentAgentConfig.apiKeys.gemini, model: "gemini-2.5-flash-preview-04-17" });
            break;
        }
        if (!llmInstance) {
          setLangchainAgent(null);
          setAgentCleanup(undefined);
          return;
        }
        // Usamos el objeto memoizado de servers conectados desde la clave para convertir a tools
        const toolsAndCleanup = await convertMcpToLangchainTools(
          currentAgentConfig.connectedServers, // Usar el objeto parseado desde la clave
          { logLevel: 'info' }
        );
        if (cancelled) {
           // Limpiar si fue cancelado
           if (toolsAndCleanup.cleanup) {
             toolsAndCleanup.cleanup();
           }
           setAgentCleanup(undefined);
           return;
        }
        const tools = toolsAndCleanup.tools;
        // DEBUG: Mostrar las tools disponibles
        if (Array.isArray(tools)) {
          console.log('Langchain tools disponibles:', tools.map(t => t.name || t));
        } else {
          console.log('Langchain tools disponibles:', tools);
        }
        
        // Almacenar la función de limpieza y el agente
        setAgentCleanup(() => toolsAndCleanup.cleanup);
        setLangchainAgent(() => createReactAgent({ llm: llmInstance, tools }));
      } catch (error) {
        console.error('Error during agent initialization:', error);
        setLangchainAgent(null);
        setAgentCleanup(undefined);
      }
    };
    initializeAgent();

    return () => {
      cancelled = true;
      // Llamar a la función de limpieza si existe
      if (agentCleanup) {
        agentCleanup();
      }
      setLangchainAgent(null);
      setAgentCleanup(undefined);
    };
  // eslint-disable-next-line
  }, [agentConfigKey, serversLoadedFromStorage, keysLoadedFromStorage, activeLLMService]); // Dependemos de la clave de configuración y las condiciones de carga/LLM

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (agentCleanup) agentCleanup();
      if (mcpCleanup) mcpCleanup();
    };
  }, [agentCleanup, mcpCleanup]); // Depende de las funciones de limpieza

  // Load API keys from localStorage
  useEffect(() => {
    try {
      const storedKeys = localStorage.getItem(LOCAL_STORAGE_API_KEYS);
      if (storedKeys) {
        const loadedKeys = JSON.parse(storedKeys) as ApiKeys;
        setApiKeys(loadedKeys); // Load the keys into state

        if (loadedKeys && typeof loadedKeys === 'object') {
          let initialProvider: LLMProvider = 'gemini';
          if (loadedKeys.openai) initialProvider = 'openai';
          if (loadedKeys.claude) initialProvider = 'claude';
          if (loadedKeys.gemini) initialProvider = 'gemini';

          setActiveLLMProvider(initialProvider);

          switch (initialProvider) {
            case 'openai': setActiveLLMService(openAIService); break;
            case 'claude': setActiveLLMService(claudeService); break;
            case 'gemini': setActiveLLMService(geminiService); break;
            default: setActiveLLMService(geminiService); // Default to Gemini
          }
        }
      }
    } catch (error) {
      console.error("Error loading API keys from localStorage:", error);
    } finally {
      setKeysLoadedFromStorage(true); // Set to true after attempting to load
    }
  }, []); // Empty dependency array for initial load

  // Save API keys to localStorage
  useEffect(() => {
    if (keysLoadedFromStorage) { // Only save if keys have been loaded from storage
      try {
        const keysToSave = JSON.stringify(apiKeys);
        localStorage.setItem(LOCAL_STORAGE_API_KEYS, keysToSave);
      } catch (error) {
        console.error("Error saving API keys to localStorage:", error);
      }
    }
  }, [apiKeys, keysLoadedFromStorage]);

  const handleApiKeysChange = (newKeys: ApiKeys) => {
    setApiKeys(newKeys); // Update the apiKeys state

    if (!newKeys[activeLLMProvider]?.trim()) {
      if (newKeys.gemini?.trim()) setActiveLLMProvider('gemini');
      else if (newKeys.openai?.trim()) setActiveLLMProvider('openai');
      else if (newKeys.claude?.trim()) setActiveLLMProvider('claude');
    }
  };

  const handleLLMProviderChange = (provider: LLMProvider) => {
    setActiveLLMProvider(provider);
    switch (provider) {
      case 'openai': setActiveLLMService(openAIService); break;
      case 'claude': setActiveLLMService(claudeService); break;
      case 'gemini': setActiveLLMService(geminiService); break;
      default: setActiveLLMService(null);
    }
  };

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-300">
        <LoadingSpinnerIcon className="w-12 h-12 text-sky-400" />
        <p className="ml-4 text-xl mt-4">Loading Application...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 text-gray-100">
      <Header user={user} signOut={signOut} />
      <main className="flex-grow container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

          <div className="lg:col-span-3 space-y-6 md:space-y-8">
            <div className="bg-gray-800 p-6 rounded-xl shadow-xl">
              <h2 className="text-xl font-semibold text-sky-400 mb-2">
                Welcome to MCP LLM Client!
              </h2>
              <p className="text-gray-400">Manage your LLM API keys, select your preferred provider, configure MCP server connections, and chat with AI.</p>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6 md:space-y-8">
            <ApiKeyManager
              apiKeys={apiKeys}
              onApiKeysChange={handleApiKeysChange}
              activeLLMProvider={activeLLMProvider}
              onLLMProviderChange={handleLLMProviderChange}
              keysLoadedFromStorage={keysLoadedFromStorage} // Pass keysLoadedFromStorage
            />
            <ServerConnection
              servers={mcpServers}
              onAddServer={handleAddServer}
              onRemoveServer={handleRemoveServer}
              onConnectToServer={handleConnectToServer}
              serversLoadedFromStorage={serversLoadedFromStorage}
            />
          </div>

          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            {/* Render LLMChat only after both keys and servers are loaded */}
            {keysLoadedFromStorage && serversLoadedFromStorage && (
              <LLMChat
                apiKeys={apiKeys}
                activeProvider={activeLLMProvider}
                mcpServers={mcpServers}
                keysLoadedFromStorage={keysLoadedFromStorage}
                langchainAgent={langchainAgent} // Pass the agent state directly
                activeLLMService={activeLLMService}
              />
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;
