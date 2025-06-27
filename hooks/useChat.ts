import { useState, useRef, useEffect, useCallback } from 'react';
import { ApiKeys, ChatMessage, LLMProvider, MCPServer, LLMService } from '../types';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

interface UseChatProps {
  apiKeys: ApiKeys;
  activeProvider: LLMProvider;
  mcpServers: MCPServer[];
  keysLoadedFromStorage: boolean;
  langchainAgent: ReturnType<typeof createReactAgent> | null;
  activeLLMService: LLMService | null;
}

interface UseChatReturn {
  messages: ChatMessage[];
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  handleSend: () => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

export const useChat = ({ 
  apiKeys,
  activeProvider,
  mcpServers,
  keysLoadedFromStorage,
  langchainAgent,
  activeLLMService
}: UseChatProps): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(scrollToBottom, [messages, scrollToBottom]);

  
  const lastChatTypeRef = useRef<string | null>(null);
  const connectedServersSignature = mcpServers
    .filter(s => s.status === 'connected')
    .map(s => s.id || s.url || JSON.stringify(s))
    .join(',');

  useEffect(() => {
    if (!keysLoadedFromStorage) return;
    const chatType = langchainAgent ? 'langchain' : activeProvider;
    if (lastChatTypeRef.current !== chatType) {
      lastChatTypeRef.current = chatType;
      const isCurrentProviderAvailable = activeLLMService?.isAvailable(apiKeys[activeProvider]) || false;
      const providerName = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);
      if (langchainAgent) {
        setMessages([{
          id: 'system-init',
          text: `Langchain agent with MCP tools ready. Type your message below.`,
          sender: 'system',
          timestamp: new Date(),
          provider: undefined
        }]);
      } else if (isCurrentProviderAvailable) {
        setMessages([{
          id: 'system-init',
          text: `${providerName} chat ready. Type your message below.`,
          sender: 'system',
          timestamp: new Date(),
          provider: activeProvider
        }]);
      } else {
        setMessages([{
          id: 'system-unavailable',
          text: `${providerName} API Key not provided or invalid. Please set it in API Key Management.`,
          sender: 'system',
          timestamp: new Date(),
          provider: activeProvider
        }]);
      }
    }
  }, [activeProvider, apiKeys, activeLLMService, keysLoadedFromStorage, langchainAgent, connectedServersSignature]);

  
  const handleSend = async () => {
    const isCurrentProviderAvailable = activeLLMService?.isAvailable(apiKeys[activeProvider]) || false;
    if (!input.trim() || isLoading || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderAvailable && mcpServers.every(server => server.status !== 'connected'))) return;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date(),
      provider: activeProvider
    };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    let botResponseText = '';
    let errorOccurred = false;
    let isStreaming = false;
    try {
      if (langchainAgent) {
        const langchainMessages = updatedMessages.slice(-20).map(msg => {
          if (msg.sender === 'user' && typeof msg.text === 'string' && msg.text.trim() !== '') {
            return new HumanMessage(msg.text);
          } else if (msg.sender === 'bot' && typeof msg.text === 'string' && msg.text.trim() !== '') {
            return new AIMessage(msg.text);
          }
          return null;
        }).filter(msg => msg !== null);
        const agentFinalState = await langchainAgent.invoke(
          { messages: langchainMessages },
          { configurable: { thread_id: "chat-thread" } }
        );
        const finalMessages = agentFinalState?.messages;
        const lastMessage = Array.isArray(finalMessages) && finalMessages.length > 0
          ? finalMessages[finalMessages.length - 1]
          : undefined;
        if (lastMessage && typeof lastMessage === 'object' && 'content' in lastMessage && typeof lastMessage.content === 'string') {
          botResponseText = lastMessage.content;
        } else {
          botResponseText = "Received an unexpected or empty response from the AI agent.";
          errorOccurred = true;
        }
      } else if (activeLLMService && activeLLMService.isAvailable(apiKeys[activeProvider])) {
        if (activeLLMService.generateTextStream) {
          isStreaming = true;
          setMessages(prev => [...prev, {
            id: `bot-${Date.now()}`,
            text: '',
            sender: 'bot',
            timestamp: new Date(),
            provider: activeProvider
          }]);
          try {
            await activeLLMService.generateTextStream(
              currentInput,
              apiKeys[activeProvider],
              (chunk) => {
                setMessages(prev => {
                  const lastMessage = { ...prev[prev.length - 1] };
                  lastMessage.text += chunk;
                  return [...prev.slice(0, -1), lastMessage];
                });
              },
              () => {
                setIsLoading(false);
                scrollToBottom();
              },
              (errorMsg) => {
                setMessages(prev => {
                  const lastMessage = { ...prev[prev.length - 1] };
                  lastMessage.text = `Error: ${errorMsg}`;
                  lastMessage.sender = 'error';
                  return [...prev.slice(0, -1), lastMessage];
                });
                setIsLoading(false);
                errorOccurred = true;
                scrollToBottom();
              }
            );
          } catch (error: any) {
            console.error(`Streaming chat error with ${activeProvider}:`, error);
            setMessages(prev => {
              const lastMessage = { ...prev[prev.length - 1] };
              lastMessage.text = `Error initiating streaming: ${error.message || 'Unknown error'}`;
              lastMessage.sender = 'error';
              return [...prev.slice(0, -1), lastMessage];
            });
            setIsLoading(false);
            errorOccurred = true;
            scrollToBottom();
          }
        } else {
          try {
            botResponseText = await activeLLMService.generateText(currentInput, apiKeys[activeProvider]);
            if (botResponseText.startsWith("Error from") ||
              botResponseText.includes("API is not available") ||
              botResponseText.includes("API client could not be initialized") ||
              botResponseText.includes("not configured") ||
              botResponseText.includes("not fully implemented") ||
              botResponseText.includes("placeholder")) {
              errorOccurred = true;
            }
          } catch (error: any) {
            console.error(`Non-streaming chat error with ${activeProvider}:`, error);
            botResponseText = `An unexpected error occurred with ${activeProvider}: ${error.message || 'Unknown error'}.`;
            errorOccurred = true;
          }
        }
      } else {
        botResponseText = "No LLM provider configured and no MCP server connected.";
        errorOccurred = true;
      }
    } catch (overallError: any) {
      console.error("Overall chat handling error:", overallError);
      botResponseText = `An unexpected error occurred: ${overallError.message || 'Unknown error'}.`;
      errorOccurred = true;
    }
    if (!isStreaming || errorOccurred) {
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: errorOccurred ? 'error' : 'bot',
        timestamp: new Date(),
        provider: langchainAgent ? undefined : activeProvider
      };
      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
      scrollToBottom();
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    handleSend,
    messagesEndRef: messagesEndRef as React.RefObject<HTMLDivElement>,
  };
};
