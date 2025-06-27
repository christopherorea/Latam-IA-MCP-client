import React, { useState, useEffect } from 'react';
import { ApiKeys, AppUser, MCPServer, MCPConnectionStatus, LLMProvider } from './types';
import Header from './components/Header';
import Footer from './components/Footer';
import ApiKeyManager from './components/ApiKeyManager';
import ServerConnection from './components/ServerConnection';
import LLMChat from './components/LLMChat';
import { LoadingSpinnerIcon } from './constants';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { convertMcpToLangchainTools, McpServerCleanupFn } from "@h1deya/langchain-mcp-tools";

// Import specific Langchain LLM integrations
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const LOCAL_STORAGE_API_KEYS = 'mcpLlmClientApiKeys';
const LOCAL_STORAGE_MCP_SERVERS = 'mcpLlmClientMcpServers';

const App: React.FC = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const loadingAuth = false;

  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai: '', claude: '', gemini: '' });
  const [activeLLMProvider, setActiveLLMProvider] = useState<LLMProvider>('gemini');
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [keysLoadedFromStorage, setKeysLoadedFromStorage] = useState<boolean>(false);
  const [serversLoadedFromStorage, setServersLoadedFromStorage] = useState<boolean>(false);

  const [langchainAgent, setLangchainAgent] = useState<ReturnType<typeof createReactAgent> | null>(null);
  const [mcpCleanup, setMcpCleanup] = useState<McpServerCleanupFn | undefined>(undefined);

  const logSetMcpServers = (updater: MCPServer[] | ((prevState: MCPServer[]) => MCPServer[])) => {
    if (typeof updater === 'function') {
      setMcpServers(prevState => {
        const newState = updater(prevState);

        return newState;
      });
    } else {

      setMcpServers(updater);
    }
  };


  useEffect(() => {

    try {
      const storedKeys = localStorage.getItem(LOCAL_STORAGE_API_KEYS);
      if (storedKeys) {
        const loadedKeys = JSON.parse(storedKeys) as ApiKeys;
        setApiKeys(loadedKeys); // Load the keys into state

        if (loadedKeys && typeof loadedKeys === 'object') {

          if (loadedKeys.gemini) setActiveLLMProvider('gemini');
          else if (loadedKeys.openai) setActiveLLMProvider('openai');
          else if (loadedKeys.claude) setActiveLLMProvider('claude');
        }
      }
    } catch (error) {
      console.error("Error loading API keys from localStorage:", error);

    } finally {
      setKeysLoadedFromStorage(true);
    }
  }, []);


  useEffect(() => {
    // Only save if keys have been loaded from storage
    if (keysLoadedFromStorage) {
      try {
        const keysToSave = JSON.stringify(apiKeys);
        localStorage.setItem(LOCAL_STORAGE_API_KEYS, keysToSave);
      } catch (error) {
        console.error("Error saving API keys to localStorage:", error);
      }
    }
  }, [apiKeys, keysLoadedFromStorage]); // Add keysLoadedFromStorage to dependency array


  useEffect(() => {

    try {
      const storedServers = localStorage.getItem(LOCAL_STORAGE_MCP_SERVERS);
      console.log("Loading MCP servers - Raw from localStorage:", storedServers); // Added log
      if (storedServers) {
        const loadedServers = JSON.parse(storedServers) as MCPServer[];
        console.log("Loading MCP servers - Parsed:", loadedServers); // Added log

        if (loadedServers && Array.isArray(loadedServers)) {


          logSetMcpServers(loadedServers.map(server => ({
            ...server,
            status: 'idle',
            statusMessage: 'Not Connected',
            client: new Client(
              { name: "MCP LLM Client", version: "1.0.0" },
              { capabilities: { tools: true } }
            ),
            transport: undefined,
          })));

        }
      }
    } catch (error) {
      console.error("Error loading MCP servers from localStorage:", error);
    } finally {
      setServersLoadedFromStorage(true);

    }
  }, []);


  useEffect(() => {
    // Only save if servers have been loaded from storage
    if (serversLoadedFromStorage) {
      try {

        const serversToSave = mcpServers.map(({ client, transport, ...rest }) => rest);
        console.log("Saving MCP servers - Data to save:", serversToSave); // Added log
        localStorage.setItem(LOCAL_STORAGE_MCP_SERVERS, JSON.stringify(serversToSave));
        console.log("Saving MCP servers - Successfully saved."); // Added log

      } catch (error) {
        console.error("Error saving MCP servers to localStorage:", error);
      }
    }
  }, [mcpServers, serversLoadedFromStorage]); // Add serversLoadedFromStorage to dependency array

  // New useEffect for initializing Langchain agent and MCP tools
  useEffect(() => {
    const initializeAgent = async () => {
      if (mcpServers.length === 0) {
        // No MCP servers configured, no tools to add to the agent
        setLangchainAgent(null);
        if (mcpCleanup) {
          await mcpCleanup();
          setMcpCleanup(undefined);
        }
        return;
      }

      try {
        // Create MCP server config for convertMcpToLangchainTools
        const mcpServerConfig = mcpServers.reduce((acc, server) => {
          acc[server.name] = {
            url: server.url,
            bearerToken: server.bearerToken,
          };
          return acc;
        }, {} as Record<string, { url: string; bearerToken?: string }>);

        // Initialize LLM based on activeLLMProvider and apiKeys
        const initChatModel = (provider: LLMProvider, keys: ApiKeys) => {
          switch (provider) {
            case 'openai':
              if (keys.openai) {
                return new ChatOpenAI({ apiKey: keys.openai });
              }
              return null;
            case 'claude':
              if (keys.claude) {
                return new ChatAnthropic({ apiKey: keys.claude });
              }
              return null;
            case 'gemini':
              if (keys.gemini) {
                return new ChatGoogleGenerativeAI({ apiKey: keys.gemini });
              }
              return null;
            default:
              return null;
          }
        };

        const llm = initChatModel(activeLLMProvider, apiKeys);

        if (!llm) {
          console.error("Failed to initialize chat model: API key not provided or invalid for selected provider.");
          setLangchainAgent(null);
          if (mcpCleanup) {
            await mcpCleanup();
            setMcpCleanup(undefined);
          }
          return;
        }

        console.log(`Initializing ${mcpServers.length} MCP server(s) for Langchain...`);

        const toolsAndCleanup = await convertMcpToLangchainTools(
          mcpServerConfig,
          { logLevel: 'info' } // Adjust log level as needed
        );
        const tools = toolsAndCleanup.tools;
        const cleanup = toolsAndCleanup.cleanup;

        const agent = createReactAgent({
          llm,
          tools,
          checkpointSaver: new MemorySaver(), // Or use a persistent checkpoint saver
        });

        setLangchainAgent(agent);
        setMcpCleanup(() => cleanup); // Store cleanup function

        console.log("Langchain agent initialized with MCP tools.");

      } catch (error) {
        console.error("Error initializing Langchain agent or MCP tools:", error);
        setLangchainAgent(null);
        if (mcpCleanup) {
          mcpCleanup(); // Call existing cleanup if it exists
          setMcpCleanup(undefined);
        }
      }
    };

    initializeAgent();

    // Cleanup function
    return () => {
      console.log("Cleaning up MCP server connections...");
      if (mcpCleanup) {
        mcpCleanup();
      }
    };
  }, [mcpServers, activeLLMProvider, apiKeys]); // Add apiKeys to dependency array

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
  };

  const handleAddServer = (name: string, url: string, bearerToken?: string) => {


    const client = new Client(
      { name: "MCP LLM Client", version: "1.0.0" },
      { capabilities: { tools: true } }
    );


    const newServer: MCPServer = {
      id: `mcp-${Date.now()}`,
      name,
      url,
      bearerToken: bearerToken?.trim() || undefined,
      status: 'idle',
      statusMessage: 'Not Connected',
      client,
      transport: undefined,
    };
    logSetMcpServers(prev => [...prev, newServer]);

  };

  const handleRemoveServer = (serverId: string) => {

    logSetMcpServers(prev => {
      const serverToRemove = prev.find(server => server.id === serverId);

      if (serverToRemove?.transport) {

        serverToRemove.transport.close();
      }
      const updatedServers = prev.filter(server => server.id !== serverId);

      return updatedServers;
    });
  };

  const updateServerStatus = (serverId: string, status: MCPConnectionStatus, message: string) => {

    logSetMcpServers(prev => prev.map(server =>
      server.id === serverId ? { ...server, status, statusMessage: message } : server
    ));
  };

  const handleConnectToServer = async (serverId: string) => {

    const server = mcpServers.find(s => s.id === serverId);
    if (!server || !server.client) {

      return;
    }



    if (server.transport) {

      server.transport.close();

      await new Promise(resolve => setTimeout(resolve, 50));

    }

    updateServerStatus(serverId, 'connecting', `Connecting to ${server.name}...`);


    try {

      const directTransport = new StreamableHTTPClientTransport(
        new URL(server.url),
        {
          requestInit: {
            method: 'POST',
            headers: {

              'Content-Type': 'application/json',
              'Accept': 'application/json; text/event-stream',

              ...(server.bearerToken && { 'Authorization': `Bearer ${server.bearerToken}` }),
            }
          },
        }
      );


      logSetMcpServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, transport: directTransport } : s
      ));



      await server.client.connect(directTransport);


      updateServerStatus(serverId, 'connected', 'Connected to MCP server.');


    } catch (error: any) {

      console.error(`Error connecting to ${server.name} using MCP SDK:`, error);
      let message = `Failed to connect: ${error.message || 'Unknown error'}.`;
      updateServerStatus(serverId, 'error', message);
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
      <Header user={user} />
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
              keysLoadedFromStorage={keysLoadedFromStorage}
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
                langchainAgent={langchainAgent} // Pass the agent to LLMChat
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
