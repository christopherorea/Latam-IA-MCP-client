import React, { useState } from 'react';
import { MCPServer, MCPConnectionStatus } from '../types';
import { ServerIcon, LoadingSpinnerIcon, TrashIcon, PlusCircleIcon, CheckCircleIcon, XCircleIcon, KeyIcon } from '../constants';

interface ServerConnectionProps {
  servers: MCPServer[];
  onAddServer: (name: string, url: string, bearerToken?: string) => void;
  onRemoveServer: (id: string) => void;
  onConnectToServer: (id: string) => void;
  serversLoadedFromStorage: boolean; 
}

const ServerConnection: React.FC<ServerConnectionProps> = ({ servers, onAddServer, onRemoveServer, onConnectToServer, serversLoadedFromStorage }) => {
  const [newServerName, setNewServerName] = useState<string>('');
  const [newServerUrl, setNewServerUrl] = useState<string>('');
  const [newServerBearerToken, setNewServerBearerToken] = useState<string>('');
  const [addServerError, setAddServerError] = useState<string>('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerName.trim() || !newServerUrl.trim()) {
      setAddServerError('Server name and URL cannot be empty.');
      return;
    }
    try {
      new URL(newServerUrl); 
    } catch (_) {
      setAddServerError('Invalid server URL format. Please include /mcp')
      return;
    }
    setAddServerError('');
    onAddServer(newServerName, newServerUrl, newServerBearerToken);
    setNewServerName('');
    setNewServerUrl('');
    setNewServerBearerToken('');
  };

  const getStatusColor = (status: MCPConnectionStatus) => {
    switch (status) {
      case 'connected': return 'text-green-300 bg-green-800/60 border-green-700';
      case 'connecting': return 'text-yellow-300 bg-yellow-800/60 border-yellow-700';
      case 'error': return 'text-red-300 bg-red-800/60 border-red-700';
      default: return 'text-gray-300 bg-gray-700/70 border-gray-600';
    }
  };
  
  const getStatusIcon = (status: MCPConnectionStatus) => {
    switch (status) {
      case 'connected': return <CheckCircleIcon className="text-green-400" />;
      case 'connecting': return <LoadingSpinnerIcon className="text-yellow-400 !w-4 !h-4 !mr-0" />;
      case 'error': return <XCircleIcon className="text-red-400" />;
      default: return <ServerIcon className="text-gray-400 !w-4 !h-4" /> ;
    }
  }

  const getConnectButtonText = (status: MCPConnectionStatus) => {
    switch (status) {
      case 'connected': return 'Reconnect';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Retry Connect';
      default: return 'Connect';
    }
  };

  
  if (!serversLoadedFromStorage) {
    return (
      <div className="bg-gray-800 p-6 rounded-xl shadow-xl flex items-center justify-center h-40">
        <LoadingSpinnerIcon className="w-6 h-6 text-sky-400 mr-2" />
        <span className="text-gray-300">Cargando servidores guardados...</span>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-800 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6 flex items-center">
        <ServerIcon className="mr-3 text-sky-400" /> MCP Server Management
      </h2>

      <form onSubmit={handleAddSubmit} className="mb-8 p-4 border border-gray-700 rounded-lg bg-gray-700/30">
        <h3 className="text-lg font-medium text-gray-200 mb-3">Add New MCP Server</h3>
        <div className="mb-4">
          <label htmlFor="newServerName" className="block text-sm font-medium text-gray-300 mb-1">Server Name/Alias</label>
          <input
            type="text"
            id="newServerName"
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            placeholder="e.g., Primary MCP"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="newServerUrl" className="block text-sm font-medium text-gray-300 mb-1">Server URL</label>
          <input
            type="url"
            id="newServerUrl"
            value={newServerUrl}
            onChange={(e) => setNewServerUrl(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            placeholder="https://mcp.example.com"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="newServerBearerToken" className="block text-sm font-medium text-gray-300 mb-1">Bearer Token (Optional)</label>
          <input
            type="password" 
            id="newServerBearerToken"
            value={newServerBearerToken}
            onChange={(e) => setNewServerBearerToken(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            placeholder="Enter optional bearer token"
            autoComplete="off"
          />
        </div>
        {addServerError && <p className="text-red-400 text-xs mb-3">{addServerError}</p>}
        <button
          type="submit"
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out transform hover:scale-102 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 flex items-center justify-center"
        >
          <PlusCircleIcon className="mr-2" /> Add Server
        </button>
      </form>

      <div>
        <h3 className="text-xl font-semibold text-gray-200 mb-4">Configured Servers</h3>
        {servers.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No MCP servers configured yet. Add one above.</p>
        ) : (
          <div className="space-y-4">
            {servers.map((server) => (
              <div key={server.id} className="p-4 bg-gray-700/50 rounded-lg border border-gray-600 shadow-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-lg font-semibold text-sky-300">{server.name}</h4>
                    <p className="text-xs text-gray-400 break-all">{server.url}</p>
                     {server.bearerToken && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center">
                            <KeyIcon className="w-3 h-3 mr-1 text-yellow-400"/> Bearer Token: Present
                        </p>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveServer(server.id)}
                    className="text-gray-400 hover:text-red-400 p-1 rounded-md transition-colors"
                    aria-label={`Remove ${server.name}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className={`text-xs p-2 rounded-md border flex items-center gap-2 mb-3 ${getStatusColor(server.status)}`}>
                   {getStatusIcon(server.status)} <strong>{server.status.charAt(0).toUpperCase() + server.status.slice(1)}:</strong> {server.statusMessage}
                </div>
                <button
                  onClick={() => onConnectToServer(server.id)}
                  disabled={server.status === 'connecting'}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-3 rounded-md transition duration-150 ease-in-out transform hover:scale-102 focus:outline-none focus:ring-1 focus:ring-teal-400 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                >
                  {server.status === 'connecting' && <LoadingSpinnerIcon className="mr-2 text-white !w-4 !h-4" />}
                  {getConnectButtonText(server.status)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
       <div className="text-sm text-yellow-200 bg-yellow-800/40 p-3 rounded-md mt-6 text-center border border-yellow-700/50 shadow">
        <p className="font-semibold">Important Note:</p>
        <p className="text-xs ">MCP server connections now attempt <strong className="font-medium">real network requests</strong> to the URLs provided. Ensure URLs are correct (including http/https) and accessible. If a server is on a different domain, it must be configured for CORS to allow requests from this application. Failures might be due to network issues, incorrect URLs, server errors, or CORS misconfiguration. Check the browser's console for more details on network errors.</p>
      </div>
    </div>
  );
};

export default ServerConnection;