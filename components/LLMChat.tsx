import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ApiKeys, ChatMessage, LLMProvider, MCPServer } from '../types';
import {
  generateGeminiText,
  isGeminiEffectivelyAvailable
} from '../services/geminiService';
import {
  generateOpenAIText,
  isOpenAIEffectivelyAvailable
} from '../services/openaiService'; // Stubbed
import {
  generateClaudeText,
  isClaudeEffectivelyAvailable
} from '../services/claudeService'; // Stubbed
import { LoadingSpinnerIcon, OpenAiIcon, ClaudeIcon, GeminiIcon, BrainIcon } from '../constants';

// Import Langchain types
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage } from "@langchain/core/messages";

interface LLMChatProps {
  apiKeys: ApiKeys;
  activeProvider: LLMProvider;
  mcpServers: MCPServer[]; // Add mcpServers to props
  keysLoadedFromStorage: boolean; // Add this prop
  langchainAgent: ReturnType<typeof createReactAgent> | null; // Add langchainAgent prop
}

const LLMChat: React.FC<LLMChatProps> = ({
  apiKeys,
  activeProvider,
  mcpServers,
  keysLoadedFromStorage,
  langchainAgent // Destructure langchainAgent
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [tools, setTools] = useState<any[]>([]); // State to store received tools

  const isCurrentProviderEffectivelyAvailable = useCallback(() => {
    switch (activeProvider) {
      case 'gemini':
        return isGeminiEffectivelyAvailable(apiKeys.gemini);
      case 'openai':
        return isOpenAIEffectivelyAvailable(apiKeys.openai);
      case 'claude':
        return isClaudeEffectivelyAvailable(apiKeys.claude);
      default:
        return false;
    }
  }, [apiKeys, activeProvider]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  useEffect(() => {
    if (!keysLoadedFromStorage) {
      return; // Wait until keys are loaded from storage
    }

    // Clear messages when provider or its key availability changes, or when agent availability changes
    setMessages([]);
    const available = isCurrentProviderEffectivelyAvailable();
    const providerName = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);

    if (langchainAgent) {
      setMessages([{
        id: 'system-init',
        text: `Langchain agent with MCP tools ready. Type your message below.`, // Updated message
        sender: 'system',
        timestamp: new Date(),
        provider: 'langchain' // Indicate Langchain is active
      }]);
    } else if (available) {
      setMessages([{
        id: 'system-init',
        text: `${providerName} chat ready. Type your message below.`, // Original message
        sender: 'system',
        timestamp: new Date(),
        provider: activeProvider
      }]);
    } else {
      setMessages([{
        id: 'system-unavailable',
        text: `${providerName} API Key not provided or invalid. Please set it in API Key Management.`, // Original message
        sender: 'system',
        timestamp: new Date(),
        provider: activeProvider
      }]);
    }

  }, [activeProvider, apiKeys, isCurrentProviderEffectivelyAvailable, mcpServers, keysLoadedFromStorage, langchainAgent]); // Add langchainAgent to dependency array

  // Add logging for debugging input disabled state
  useEffect(() => {
    console.log('LLMChat state/props update:');
    console.log('  keysLoadedFromStorage:', keysLoadedFromStorage);
    console.log('  activeProvider:', activeProvider);
    console.log('  apiKeys:', apiKeys); // Log the apiKeys object
    console.log('  isCurrentProviderEffectivelyAvailable():', isCurrentProviderEffectivelyAvailable());
    console.log('  langchainAgent present:', !!langchainAgent); // Log boolean presence
    console.log('  mcpServers status:', mcpServers.map(server => server.status));
    console.log('  isLoading:', isLoading);
    console.log('  input is empty:', !input.trim());
    const isSendButtonDisabled = isLoading || !input.trim() || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable() && mcpServers.every(server => server.status !== 'connected'));
    console.log('  isSendButtonDisabled (determines input disabled state):', isSendButtonDisabled);
  }, [isLoading, input, keysLoadedFromStorage, activeProvider, apiKeys, isCurrentProviderEffectivelyAvailable, langchainAgent, mcpServers]);


  const handleSend = async () => {
    // Allow sending if input is not empty AND (Langchain agent is available OR a provider is available OR an MCP server is connected)
    if (!input.trim() || isLoading || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable() && mcpServers.every(server => server.status !== 'connected'))) return; // Add langchainAgent check

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date(),
      provider: activeProvider // Still associate with activeProvider for display
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    let botResponseText = '';
    let errorOccurred = false;

    try {
      if (langchainAgent) {
        // Use Langchain agent if available
        console.log("Using Langchain agent...");
        const agentFinalState = await langchainAgent.invoke(
          { messages: [new HumanMessage(currentInput)] },
          { configurable: { thread_id: "chat-thread" } } // Use a consistent thread ID
        );

        // Extract the final AI message from the agent's state
        const lastMessage = agentFinalState.messages[agentFinalState.messages.length - 1];

        if (lastMessage && lastMessage.content) {
          botResponseText = lastMessage.content as string; // Assuming the final message content is a string
        } else {
          console.warn("Langchain agent did not return a final message with content:", agentFinalState);
          botResponseText = "Received an unexpected response from the AI agent.";
          errorOccurred = true;
        }

      } else {
        // Fallback to existing logic if Langchain agent is not available
        console.log("Langchain agent not available, falling back to direct connection...");
        const connectedServer = mcpServers.find(server => server.status === 'connected');

        if (connectedServer && connectedServer.client) {
          // ...existing MCP server interaction logic...
          try {
            const response = await (connectedServer.client as any).request('chat/message', { text: currentInput });
            const responseResult = response as any;

            if (responseResult && responseResult.toolCall) {
              // ...existing tool call handling...
              setMessages(prev => [...prev, {
                id: `toolcall-${Date.now()}`,
                text: `Ejecutando herramienta: ${responseResult.toolCall.name}...`,
                sender: 'system',
                timestamp: new Date(),
                provider: activeProvider
              }]);

              try {
                const toolResultResponse = await connectedServer.client.callTool({
                  name: responseResult.toolCall.name,
                  arguments: responseResult.toolCall.arguments
                });
                botResponseText = (toolResultResponse as any)?.text || `Tool ${responseResult.toolCall.name} executed successfully.`;
              } catch (toolError: any) {
                console.error(`Error executing tool ${responseResult.toolCall.name}:`, toolError);
                botResponseText = `Error executing tool ${responseResult.toolCall.name}: ${toolError.message || 'Unknown error'}`;
                errorOccurred = true;
              }

            } else if (responseResult && responseResult.text) {
              botResponseText = responseResult.text;
            } else {
              console.warn("MCP server response did not contain a text or toolCall property:", response);
              botResponseText = "Received an unexpected response from the MCP server.";
              errorOccurred = true;
            }
          } catch (error: any) {
            console.error("Error interacting with MCP server:", error);
            botResponseText = `Error from MCP server: ${error.message || 'Unknown error'}`;
            errorOccurred = true;
          }

        } else if (isCurrentProviderEffectivelyAvailable()) {
          // ...existing individual LLM provider logic...
          try {
            switch (activeProvider) {
              case 'gemini':
                botResponseText = await generateGeminiText(currentInput, apiKeys.gemini);
                break;
              case 'openai':
                botResponseText = await generateOpenAIText(currentInput, apiKeys.openai);
                break;
              case 'claude':
                botResponseText = await generateClaudeText(currentInput, apiKeys.claude);
                break;
              default:
                botResponseText = "Selected LLM provider is not recognized.";
                errorOccurred = true;
            }

            // Check for error messages from services
            if (botResponseText.startsWith("Error from") ||
              botResponseText.includes("API is not available") ||
              botResponseText.includes("API client could not be initialized") ||
              botResponseText.includes("not configured") ||
              botResponseText.includes("not fully implemented") ||
              botResponseText.includes("placeholder")) {
              errorOccurred = true;
            }

          } catch (error: any) {
            console.error(`Chat error with ${activeProvider}:`, error);
            botResponseText = "An unexpected error occurred. Please try again.";
            errorOccurred = true;
          }
        } else {
          botResponseText = "No LLM provider configured and no MCP server connected.";
          errorOccurred = true;
        }
      }
    } catch (overallError: any) {
      console.error("Overall chat handling error:", overallError);
      botResponseText = `An unexpected error occurred: ${overallError.message || 'Unknown error'}.`;
      errorOccurred = true;
    }

    const botMessage: ChatMessage = {
      id: `bot-${Date.now()}`,
      text: botResponseText,
      sender: errorOccurred ? 'error' : 'bot',
      timestamp: new Date(),
      provider: langchainAgent ? 'langchain' : activeProvider // Indicate if Langchain was used
    };
    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

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
    if (langchainAgent) return "Type your message to the Langchain agent..."; // Updated placeholder
    const providerName = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);
    if (isCurrentProviderEffectivelyAvailable()) return `Type your message to ${providerName}...`;
    return `${providerName} API Key not configured`;
  };

  const ProviderIcon = () => {
    if (langchainAgent) return <BrainIcon className="mr-3 text-sky-400 h-6 w-6" />; // Use BrainIcon for Langchain
    switch(activeProvider) {
        case 'gemini': return <GeminiIcon className="mr-3 text-sky-400 h-6 w-6" />;
        case 'openai': return <OpenAiIcon className="mr-3 text-sky-400 h-6 w-6" />;
        case 'claude': return <ClaudeIcon className="mr-3 text-sky-400 h-6 w-6" />;
        default: return <BrainIcon className="mr-3 text-sky-400 h-6 w-6" />;
    }
  };

  const providerTitleName = langchainAgent ? "Langchain Agent" : activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1); // Update title

  // New variable to control input field disabled state
  const isInputDisabled = isLoading || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable() && mcpServers.every(server => server.status !== 'connected'));

  // Keep isSendButtonDisabled for the button, which should be disabled if input is empty
  const isSendButtonDisabled = isLoading || !input.trim() || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable() && mcpServers.every(server => server.status !== 'connected'));

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
          {!langchainAgent && !isCurrentProviderEffectivelyAvailable() && messages.length <=1 && ( // Show message if no agent or provider is available
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
              onKeyPress={(e) => e.key === 'Enter' && !isSendButtonDisabled && handleSend()} // Use the new disabled state for button logic
              placeholder={getPlaceholderText()}
              className="flex-grow px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-l-lg text-gray-200 focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-colors disabled:opacity-60"
              disabled={isInputDisabled} // Use the new input disabled state
            />
            <button
              onClick={handleSend}
              disabled={isSendButtonDisabled} // Use the original send button disabled state
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2.5 px-5 sm:px-6 rounded-r-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px] sm:min-w-[100px]"
            >
              {isLoading ? <LoadingSpinnerIcon className="w-5 h-5 text-white"/> : 'Send'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LLMChat;
