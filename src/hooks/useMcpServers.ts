import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MCPServer, MCPConnectionStatus } from '../types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServerCleanupFn } from "@h1deya/langchain-mcp-tools";

const LOCAL_STORAGE_MCP_SERVERS = 'mcpLlmClientMcpServers';

interface UseMcpServersProps {}

interface UseMcpServersReturn {
  mcpServers: MCPServer[];
  serversLoadedFromStorage: boolean;
  handleAddServer: (name: string, url: string, bearerToken?: string) => void;
  handleRemoveServer: (serverId: string) => void;
  handleConnectToServer: (serverId: string) => Promise<void>;
  mcpCleanup: McpServerCleanupFn | undefined;
  mcpServerConfig: Record<string, { url: string; bearerToken?: string }>;
  connectedServersVersion: number;
  stableConnectedServerConfig: Record<string, { url: string; bearerToken?: string }>;
}

export const useMcpServers = ({}: UseMcpServersProps): UseMcpServersReturn => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [serversLoadedFromStorage, setServersLoadedFromStorage] = useState<boolean>(false);
  const [mcpCleanup, setMcpCleanup] = useState<McpServerCleanupFn | undefined>(undefined);
  const [connectedServersVersion, setConnectedServersVersion] = useState(0);

  
  const updateServers = useCallback((updater: MCPServer[] | ((prev: MCPServer[]) => MCPServer[])) => {
    setMcpServers(updater);
  }, []);

  
  useEffect(() => {
    try {
      const storedServers = localStorage.getItem(LOCAL_STORAGE_MCP_SERVERS);
      if (storedServers) {
        const loadedServers = JSON.parse(storedServers) as MCPServer[];
        if (Array.isArray(loadedServers)) {
          updateServers(loadedServers.map(server => ({
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
  }, [updateServers]);

  
  useEffect(() => {
    if (serversLoadedFromStorage) {
      try {
        const serversToSave = mcpServers.map(({ client, transport, ...rest }) => rest);
        localStorage.setItem(LOCAL_STORAGE_MCP_SERVERS, JSON.stringify(serversToSave));
      } catch (error) {
        console.error("Error saving MCP servers to localStorage:", error);
      }
    }
  }, [mcpServers, serversLoadedFromStorage]);

  
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
    updateServers(prev => [...prev, newServer]);
  }, [updateServers]);

  const handleRemoveServer = useCallback((serverId: string) => {
    updateServers(prev => {
      const serverToRemove = prev.find(server => server.id === serverId);
      if (serverToRemove?.transport) serverToRemove.transport.close();
      return prev.filter(server => server.id !== serverId);
    });
  }, [updateServers]);

  const updateServerStatus = useCallback((serverId: string, status: MCPConnectionStatus, message: string) => {
    updateServers(prev => prev.map(server =>
      server.id === serverId ? { ...server, status, statusMessage: message } : server
    ));
  }, [updateServers]);

  const handleConnectToServer = useCallback(async (serverId: string) => {
    const server = mcpServers.find(s => s.id === serverId);
    if (!server || !server.client) return;
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
      updateServers(prev => prev.map(s =>
        s.id === serverId ? { ...s, transport: directTransport } : s
      ));
      await server.client.connect(directTransport);
      updateServerStatus(serverId, 'connected', 'Connected to MCP server.');
    } catch (error: any) {
      console.error(`Error connecting to ${server.name} using MCP SDK:`, error);
      updateServerStatus(serverId, 'error', `Failed to connect: ${error.message || 'Unknown error'}.`);
    }
  }, [mcpServers, updateServerStatus, updateServers]);

  
  const mcpServerConfig = useMemo(() => {
    return mcpServers.reduce((acc, server) => {
      acc[server.name] = {
        url: server.url,
        bearerToken: server.bearerToken,
      };
      return acc;
    }, {} as Record<string, { url: string; bearerToken?: string }>);
  }, [mcpServers]);

  
  const stableConnectedServerConfigInternal = useMemo(() => {
    return mcpServers.filter(s => s.status === 'connected').reduce((acc, server) => {
      acc[server.name] = {
        url: server.url,
        bearerToken: server.bearerToken,
      };
      return acc;
    }, {} as Record<string, { url: string; bearerToken?: string }>);
  }, [mcpServers]);

  
  const prevStableConnectedServerConfigInternalRef = useRef(stableConnectedServerConfigInternal);
  useEffect(() => {
    const currentConfigString = JSON.stringify(stableConnectedServerConfigInternal);
    const prevConfigString = JSON.stringify(prevStableConnectedServerConfigInternalRef.current);
    if (currentConfigString !== prevConfigString) {
      setConnectedServersVersion(prev => prev + 1);
      prevStableConnectedServerConfigInternalRef.current = stableConnectedServerConfigInternal;
    }
  }, [stableConnectedServerConfigInternal]);

  
  useEffect(() => {
    if (!serversLoadedFromStorage) return;
    mcpServers.forEach((server) => {
      if (server.status === 'idle') handleConnectToServer(server.id);
    });
  }, [serversLoadedFromStorage]);

  return {
    mcpServers,
    serversLoadedFromStorage,
    handleAddServer,
    handleRemoveServer,
    handleConnectToServer,
    mcpCleanup,
    mcpServerConfig,
    connectedServersVersion,
    stableConnectedServerConfig: stableConnectedServerConfigInternal,
  };
};
