import React from 'react'; 
import { ApiKeys, ChatMessage, LLMProvider, MCPServer, LLMService } from '../types';
import { LoadingSpinnerIcon, OpenAiIcon, ClaudeIcon, GeminiIcon, BrainIcon } from '../constants';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { useChat } from '../hooks/useChat';

interface LLMChatProps {
  apiKeys: ApiKeys;
  activeProvider: LLMProvider;
  mcpServers: MCPServer[];
  keysLoadedFromStorage: boolean;
  langchainAgent: ReturnType<typeof createReactAgent> | null;
  activeLLMService: LLMService | null; 
}

const LLMChat: React.FC<LLMChatProps> = ({
  apiKeys,
  activeProvider,
  mcpServers,
  keysLoadedFromStorage,
  langchainAgent,
  activeLLMService
}) => {
  
  const { messages, input, setInput, isLoading, handleSend, messagesEndRef } = useChat({
    apiKeys,
    activeProvider,
    mcpServers,
    keysLoadedFromStorage,
    langchainAgent,
    activeLLMService,
  });

  
  
  const isCurrentProviderEffectivelyAvailable = activeLLMService?.isAvailable(apiKeys[activeProvider]) || false;

  const getBubbleClasses = (sender: ChatMessage['sender']) => {
    switch (sender) {
      case 'user':
        return 'bg-sky-600 text-white self-end rounded-t-xl rounded-bl-xl';
      case 'bot':
        return 'bg-gray-700 text-gray-200 self-start rounded-t-xl rounded-br-xl';
      case 'system':
        return 'bg-transparent text-gray-400 self-center text-xs italic px-2 py-1 text-center';
      case 'error':
        return 'bg-red-700/60 text-red-200 self-start rounded-lg border border-red-600';
      default:
        return 'bg-gray-600 text-white self-start rounded-lg';
    }
  };

  const getPlaceholderText = () => {
    if (!keysLoadedFromStorage) return "Cargando claves API...";
    if (langchainAgent) return "Type your message to the Langchain agent..."; 
    const providerName = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);
    
    if (isCurrentProviderEffectivelyAvailable) return `Type your message to ${providerName}...`;
    return `${providerName} API Key not configured`;
  };

  const ProviderIcon = () => {
    if (langchainAgent) return <BrainIcon className="mr-3 text-sky-400 h-6 w-6" />; 
    switch (activeProvider) {
      case 'gemini': return <GeminiIcon className="mr-3 text-sky-400 h-6 w-6" />;
      case 'openai': return <OpenAiIcon className="mr-3 text-sky-400 h-6 w-6" />;
      case 'claude': return <ClaudeIcon className="mr-3 text-sky-400 h-6 w-6" />;
      default: return <BrainIcon className="mr-3 text-sky-400 h-6 w-6" />;
    }
  };

  const providerTitleName = langchainAgent ? "Langchain Agent" : activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1); 

  
  const isInputDisabled = isLoading || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable && mcpServers.every(server => server.status !== 'connected'));

  
  const isSendButtonDisabled = isLoading || !input.trim() || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable && mcpServers.every(server => server.status !== 'connected'));

  return (
    <div className="p-4 sm:p-6 bg-gray-800 rounded-xl shadow-xl flex flex-col h-[600px] max-h-[70vh]">
      <h2 className="text-xl sm:text-2xl font-semibold text-sky-400 mb-4 flex items-center">
        <ProviderIcon /> Chat with {providerTitleName}
      </h2>
      {!keysLoadedFromStorage ? (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinnerIcon className="w-6 h-6 text-sky-400 mr-2" />
          <span className="text-gray-300">Cargando claves API...</span>
        </div>
      ) : (
        <>
          {!langchainAgent && !isCurrentProviderEffectivelyAvailable && messages.length <= 1 && ( 
            <div className="p-3 mb-4 text-center bg-yellow-800/60 text-yellow-300 rounded-lg border border-yellow-700 text-sm">
              {getPlaceholderText()}. Chat features disabled.
            </div>
          )}
          <div className="flex-grow overflow-y-auto mb-4 p-3 space-y-4 bg-gray-850 rounded-lg border border-gray-700 custom-scrollbar">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : msg.sender === 'system' ? 'justify-center' : 'justify-start'}`}>
                <div
                  className={`max-w-xs md:max-w-md lg:max-w-lg px-3.5 py-2.5 shadow ${getBubbleClasses(msg.sender)}`}
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.sender !== 'system' && (
                    <p className={`text-xs mt-1.5 ${msg.sender === 'user' ? 'text-sky-200/80' : 'text-gray-400/80'} text-right`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}

                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex items-center border-t border-gray-700 pt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSendButtonDisabled && handleSend()} 
              placeholder={getPlaceholderText()}
              className="flex-grow px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-l-lg text-gray-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors disabled:opacity-60"
              disabled={isInputDisabled} 
            />
            <button
              onClick={handleSend} 
              disabled={isSendButtonDisabled} 
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-5 sm:px-6 rounded-r-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] sm:min-w-[100px]"
            >
              {isLoading ? <LoadingSpinnerIcon className="w-5 h-5 text-white" /> : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LLMChat;
