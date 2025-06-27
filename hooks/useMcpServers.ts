import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MCPServer, MCPConnectionStatus } from '../types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpServerCleanupFn } from "@h1deya/langchain-mcp-tools";

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
  connectedServersVersion: number; // Nuevo estado expuesto
}

export const useMcpServers = ({}: UseMcpServersProps): UseMcpServersReturn => {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [serversLoadedFromStorage, setServersLoadedFromStorage] = useState<boolean>(false);
  const [mcpCleanup, setMcpCleanup] = useState<McpServerCleanupFn | undefined>(undefined);
  // Nuevo estado para rastrear cambios en servidores conectados
  const [connectedServersVersion, setConnectedServersVersion] = useState(0);

  // Helper function to update servers state and log
  // Simplificamos esta función para que solo actualice el estado mcpServers
  const logSetMcpServers = useCallback((updater: MCPServer[] | ((prevState: MCPServer[]) => MCPServer[])) => {
    if (typeof updater === 'function') {
      setMcpServers(prevState => {
        const newState = updater(prevState);
        // console.log('logSetMcpServers (function updater) - New State:', newState); // Opcional: mantener logs si son útiles
        return newState;
      });
    } else {
      // console.log('logSetMcpServers (direct updater) - New State:', updater); // Opcional: mantener logs si son útiles
      setMcpServers(updater);
    }
  }, []); // Dependencias vacías: []

  // Effect to load servers from localStorage
  useEffect(() => {
    try {
      const storedServers = localStorage.getItem(LOCAL_STORAGE_MCP_SERVERS);
      if (storedServers) {
        const loadedServers = JSON.parse(storedServers) as MCPServer[];
        if (loadedServers && Array.isArray(loadedServers)) {
          // Reset status and client/transport on load
          // Asegurarse de que esta actualización use logSetMcpServers para que el useEffect de version reaccione
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
  }, [logSetMcpServers]); // Depende de logSetMcpServers

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
  }, [mcpServers, serversLoadedFromStorage]); // Depende de mcpServers y serversLoadedFromStorage

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
  }, [logSetMcpServers]); // Depende de logSetMcpServers

  const handleRemoveServer = useCallback((serverId: string) => {
    logSetMcpServers(prev => {
      const serverToRemove = prev.find(server => server.id === serverId);
      if (serverToRemove?.transport) {
        serverToRemove.transport.close();
      }
      const updatedServers = prev.filter(server => server.id !== serverId);
      return updatedServers;
    });
  }, [logSetMcpServers]); // Depende de logSetMcpServers

  const updateServerStatus = useCallback((serverId: string, status: MCPConnectionStatus, message: string) => {
    logSetMcpServers(prev => prev.map(server =>
      server.id === serverId ? { ...server, status, statusMessage: message } : server
    ));
  }, [logSetMcpServers]); // Depende de logSetMcpServers

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

      // Actualizar el transporte usando logSetMcpServers
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
  }, [mcpServers, updateServerStatus, logSetMcpServers]); // Depende de mcpServers, updateServerStatus, logSetMcpServers

  // Create MCP server config for Langchain agent initialization
  const mcpServerConfig = useMemo(() => {
     return mcpServers.reduce((acc, server) => {
      acc[server.name] = {
        url: server.url,
        bearerToken: server.bearerToken,
      };
      return acc;
    }, {} as Record<string, { url: string; bearerToken?: string }>);
  }, [mcpServers]); // Depende de mcpServers

  // Memo para obtener una representación estable de la configuración de los servidores CONECTADOS
  const stableConnectedServerConfigInternal = useMemo(() => {
    const config = mcpServers.filter(s => s.status === 'connected').reduce((acc, server) => {
      acc[server.name] = {
        url: server.url,
        bearerToken: server.bearerToken,
      };
      return acc;
    }, {} as Record<string, { url: string; bearerToken?: string }>);
    console.log('useMcpServers: stableConnectedServerConfigInternal memo re-evaluated:', JSON.stringify(config));
    return config; // Return the object, not the stringified version
  }, [mcpServers]); // Depende de mcpServers

  // Nuevo useEffect para actualizar connectedServersVersion cuando cambie la configuración de servers conectados
  const prevStableConnectedServerConfigInternalRef = useRef(stableConnectedServerConfigInternal);
  useEffect(() => {
    // Deep comparison might be needed here if the object structure is complex,
    // but for this simple structure, a shallow comparison might suffice if the object reference changes.
    // A safer approach is to stringify for comparison if deep changes matter.
    const currentConfigString = JSON.stringify(stableConnectedServerConfigInternal);
    const prevConfigString = JSON.stringify(prevStableConnectedServerConfigInternalRef.current);

    if (currentConfigString !== prevConfigString) {
      console.log('useMcpServers: stableConnectedServerConfigInternal changed. Incrementing connectedServersVersion.');
      setConnectedServersVersion(prev => prev + 1);
      prevStableConnectedServerConfigInternalRef.current = stableConnectedServerConfigInternal;
    } else {
       console.log('useMcpServers: stableConnectedServerConfigInternal did not change. connectedServersVersion not incremented.');
    }
  }, [stableConnectedServerConfigInternal]); // Depende del memo object

  // Efecto para conectar automáticamente a los servidores MCP en estado 'idle' tras cargar desde localStorage
  useEffect(() => {
    if (!serversLoadedFromStorage) return;
    // Solo intentamos conectar los que estén en 'idle'
    mcpServers.forEach((server) => {
      if (server.status === 'idle') {
        // Llamar a handleConnectToServer para cada uno
        handleConnectToServer(server.id);
      }
    });
  }, [serversLoadedFromStorage]); // Depende de serversLoadedFromStorage

  return {
    mcpServers,
    serversLoadedFromStorage,
    handleAddServer,
    handleRemoveServer,
    handleConnectToServer,
    mcpCleanup,
    mcpServerConfig,
    connectedServersVersion, // Exponer el nuevo valor
    stableConnectedServerConfig: stableConnectedServerConfigInternal, // Exponer el objeto memoizado
  };
};
