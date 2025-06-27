import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MCPServer, MCPConnectionStatus } from '../types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { convertMcpToLangchainTools, McpServerCleanupFn } from "@h1deya/langchain-mcp-tools";

const LOCAL_STORAGE_MCP_SERVERS = 'mcpLlmClientMcpServers';

interface UseMcpServersProps {
  // No props needed for now, but keep the interface for future expansion
}

interface UseMcpServersReturn {
  mcpServers: MCPServer[];
  serversLoadedFromStorage: boolean;
  handleAddServer: (name: string, url: string, bearerToken?: string) => void;
  handleRemoveServer: (serverId: string) => void;
  handleConnectToServer: (serverId: string) => Promise<void>;
  mcpCleanup: McpServerCleanupFn | undefined;
  mcpServerConfig: Record<string, { url: string; bearerToken?: string }>;
}

export const useMcpServers = ({}: UseMcpServersProps): UseMcpServersReturn => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [serversLoadedFromStorage, setServersLoadedFromStorage] = useState<boolean>(false);
  const [mcpCleanup, setMcpCleanup] = useState<McpServerCleanupFn | undefined>(undefined);

  // Helper function to update servers state and log
  const logSetMcpServers = useCallback((updater: MCPServer[] | ((prevState: MCPServer[]) => MCPServer[])) => {
    if (typeof updater === 'function') {
      setMcpServers(prevState => {
        const newState = updater(prevState);
        // console.log("MCP Servers updated:", newState);
        return newState;
      });
    } else {
      setMcpServers(updater);
      // console.log("MCP Servers set:", updater);
    }
  }, []);

  // Effect to load servers from localStorage
  useEffect(() => {
    try {
      const storedServers = localStorage.getItem(LOCAL_STORAGE_MCP_SERVERS);
      if (storedServers) {
        const loadedServers = JSON.parse(storedServers) as MCPServer[];
        if (loadedServers && Array.isArray(loadedServers)) {
          // Reset status and client/transport on load
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
  }, [logSetMcpServers]); // Add logSetMcpServers to dependency array

  // Effect to save servers to localStorage
  useEffect(() => {
    // Only save if servers have been loaded from storage
    if (serversLoadedFromStorage) {
      try {
        // Exclude client and transport from saving
        const serversToSave = mcpServers.map(({ client, transport, ...rest }) => rest);
        localStorage.setItem(LOCAL_STORAGE_MCP_SERVERS, JSON.stringify(serversToSave));
      } catch (error) {
        console.error("Error saving MCP servers to localStorage:", error);
      }
    }
  }, [mcpServers, serversLoadedFromStorage]); // Add serversLoadedFromStorage to dependency array

  // Handlers for adding, removing, and connecting to servers
  const handleAddServer = useCallback((name: string, url: string, bearerToken?: string) => {
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
  }, [logSetMcpServers]);

  const handleRemoveServer = useCallback((serverId: string) => {
    logSetMcpServers(prev => {
      const serverToRemove = prev.find(server => server.id === serverId);
      if (serverToRemove?.transport) {
        serverToRemove.transport.close();
      }
      const updatedServers = prev.filter(server => server.id !== serverId);
      return updatedServers;
    });
  }, [logSetMcpServers]);

  const updateServerStatus = useCallback((serverId: string, status: MCPConnectionStatus, message: string) => {
    logSetMcpServers(prev => prev.map(server =>
      server.id === serverId ? { ...server, status, statusMessage: message } : server
    ));
  }, [logSetMcpServers]);

  const handleConnectToServer = useCallback(async (serverId: string) => {
    const server = mcpServers.find(s => s.id === serverId);
    if (!server || !server.client) {
      return;
    }

    if (server.transport) {
      server.transport.close();
      await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to allow cleanup
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
  }, [mcpServers, updateServerStatus, logSetMcpServers]); // Add dependencies

  // Create MCP server config for Langchain agent initialization
  const mcpServerConfig = mcpServers.reduce((acc, server) => {
    acc[server.name] = {
      url: server.url,
      bearerToken: server.bearerToken,
    };
    return acc;
  }, {} as Record<string, { url: string; bearerToken?: string }>);

  // Effect to initialize Langchain agent and MCP tools (moved from App.tsx)
  // Usar un hash/memo para evitar loops y solo depender de la config de servers
  const stableConfig = useMemo(() => JSON.stringify(mcpServerConfig), [mcpServerConfig]);
  const lastConfigRef = useRef('');
  useEffect(() => {
    let cancelled = false;
    if (lastConfigRef.current === stableConfig) return;
    lastConfigRef.current = stableConfig;
    const initializeAgent = async () => {
      if (mcpServers.length === 0) {
        if (mcpCleanup) {
          await mcpCleanup();
          setMcpCleanup(undefined);
        }
        return;
      }
      try {
        const toolsAndCleanup = await convertMcpToLangchainTools(
          mcpServerConfig,
          { logLevel: 'info' }
        );
        if (cancelled) return;
        setMcpCleanup(() => toolsAndCleanup.cleanup);
        // console.log("MCP tools and cleanup initialized.");
      } catch (error) {
        if (mcpCleanup) {
          mcpCleanup();
          setMcpCleanup(undefined);
        }
      }
    };
    initializeAgent();
    return () => {
      cancelled = true;
      // No cleanup aquí, solo si cambia la config
    };
    // eslint-disable-next-line
  }, [stableConfig]);

  return {
    mcpServers,
    serversLoadedFromStorage,
    handleAddServer,
    handleRemoveServer,
    handleConnectToServer,
    mcpCleanup, // Expose cleanup for App.tsx to pass to Langchain effect
    mcpServerConfig, // Expose config for App.tsx to pass to Langchain effect
  };
};
