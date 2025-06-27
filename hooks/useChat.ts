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

  // Effect to scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  // Effect to initialize chat messages based on availability
  // Solo reiniciar mensajes si cambia el "tipo" de chat (provider <-> langchainAgent)
  const lastChatTypeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!keysLoadedFromStorage) return;

    const chatType = langchainAgent ? 'langchain' : activeProvider;
    if (lastChatTypeRef.current !== chatType) {
      lastChatTypeRef.current = chatType;
      setMessages([]);
      const isCurrentProviderEffectivelyAvailable = activeLLMService?.isAvailable(apiKeys[activeProvider]) || false;
      const providerName = activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1);
      if (langchainAgent) {
        setMessages([{
          id: 'system-init',
          text: `Langchain agent with MCP tools ready. Type your message below.`,
          sender: 'system',
          timestamp: new Date(),
          provider: undefined // No es un LLMProvider estándar
        }]);
      } else if (isCurrentProviderEffectivelyAvailable) {
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
  }, [activeProvider, apiKeys, keysLoadedFromStorage, langchainAgent, activeLLMService]); // Add activeLLMService to dependency array

  // This function will contain the core chat logic
  const handleSend = async () => {
    // Allow sending if input is not empty AND (Langchain agent is available OR a provider is available OR an MCP server is connected)
    const isCurrentProviderEffectivelyAvailable = activeLLMService?.isAvailable(apiKeys[activeProvider]) || false; // Recalculate or pass as prop if needed
    if (!input.trim() || isLoading || !keysLoadedFromStorage || (!langchainAgent && !isCurrentProviderEffectivelyAvailable && mcpServers.every(server => server.status !== 'connected'))) return; // Add langchainAgent check

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      text: input,
      sender: 'user',
      timestamp: new Date(),
      provider: activeProvider // Still associate with activeProvider for display
    };
    const updatedMessages = [...messages, userMessage]; // Create the array including the new message
    setMessages(updatedMessages); // Update state
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    let botResponseText = '';
    let errorOccurred = false;
    let isStreaming = false; // Flag to indicate if streaming is active

    try {
      if (langchainAgent) {
        // Use Langchain agent if available
        // Map ChatMessage objects to Langchain message types and take the last 20
        const langchainMessages = updatedMessages.slice(-20).map(msg => { // Use updatedMessages here
          // Filter out messages with empty text content and ensure correct types
          if (msg.sender === 'user' && typeof msg.text === 'string' && msg.text.trim() !== '') {
            return new HumanMessage(msg.text);
          } else if (msg.sender === 'bot' && typeof msg.text === 'string' && msg.text.trim() !== '') {
            return new AIMessage(msg.text);
          }
          // Optionally handle other message types or filter them out
          return null;
        }).filter(msg => msg !== null); // Filter out any null messages

        const agentFinalState = await langchainAgent.invoke(
          { messages: langchainMessages }, // Pass the mapped and sliced messages
          { configurable: { thread_id: "chat-thread" } } // Use a consistent thread ID
        );

        // Extract the final AI message from the agent's state and ensure it is valid
        const finalMessages = agentFinalState?.messages;
        const lastMessage = Array.isArray(finalMessages) && finalMessages.length > 0
          ? finalMessages[finalMessages.length - 1]
          : undefined;

        if (lastMessage && typeof lastMessage === 'object' && 'content' in lastMessage && typeof lastMessage.content === 'string') {
          botResponseText = lastMessage.content;
        } else {
          console.warn("Langchain agent did not return a final message with valid content:", agentFinalState);
          botResponseText = "Received an unexpected or empty response from the AI agent.";
          errorOccurred = true;
        }

      } else {
        // Fallback to existing logic if Langchain agent is not available
        console.log("Langchain agent not available, falling back to direct connection or individual provider...");
        const connectedServer = mcpServers.find(server => server.status === 'connected');

        if (connectedServer && connectedServer.client) {
          // ...existing MCP server interaction logic (remains the same)...
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

        } else if (activeLLMService && activeLLMService.isAvailable(apiKeys[activeProvider])) { // Use activeLLMService
          // Use the active LLM service
          // Check if streaming is supported and use it if available
          if (activeLLMService.generateTextStream) {
            // Handle streaming response
            isStreaming = true; // Set streaming flag
            setMessages(prev => [...prev, {
              id: `bot-${Date.now()}`,
              text: '', // Start with empty text
              sender: 'bot',
              timestamp: new Date(),
              provider: activeProvider
            }]);

            try {
                await activeLLMService.generateTextStream(
                  currentInput,
                  apiKeys[activeProvider],
                  (chunk) => {
                    // Update the last message with the new chunk
                    setMessages(prev => {
                      const lastMessage = { ...prev[prev.length - 1] };
                      lastMessage.text += chunk;
                      return [...prev.slice(0, -1), lastMessage];
                    });
                  },
                  () => {
                    // On complete
                    setIsLoading(false);
                    scrollToBottom();
                  },
                  (errorMsg) => {
                    // On error
                    setMessages(prev => {
                      const lastMessage = { ...prev[prev.length - 1] };
                      lastMessage.text = `Error: ${errorMsg}`;
                      lastMessage.sender = 'error';
                      return [...prev.slice(0, -1), lastMessage];
                    });
                    setIsLoading(false);
                    errorOccurred = true; // Mark as error
                    scrollToBottom();
                  }
                );
            } catch (error: any) {
                console.error(`Streaming chat error with ${activeProvider}:`, error);
                // If an error occurs during streaming setup or before the first chunk
                setMessages(prev => {
                    const lastMessage = { ...prev[prev.length - 1] };
                    lastMessage.text = `Error initiating streaming: ${error.message || 'Unknown error'}`;
                    lastMessage.sender = 'error';
                    return [...prev.slice(0, -1), lastMessage];
                });
                setIsLoading(false);
                errorOccurred = true; // Mark as error
                scrollToBottom();
            }

          } else {
            // Fallback to non-streaming if not supported or available
            try {
                botResponseText = await activeLLMService.generateText(currentInput, apiKeys[activeProvider]);

                // The service's generateText should ideally throw on error or return a specific error structure.
                // For now, keep the basic check, but ideally, this would be more robust based on service implementation.
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
      }
    } catch (overallError: any) {
      console.error("Overall chat handling error:", overallError);
      botResponseText = `An unexpected error occurred: ${overallError.message || 'Unknown error'}.`;
      errorOccurred = true;
    }

    // Only add a new message if not streaming (streaming updates the last message)
    // or if an error occurred during a streaming attempt before the first chunk.
    // If streaming was attempted and failed before the first chunk, errorOccurred will be true and isStreaming will be true initially.
    // If streaming completed successfully, the callback handles setting isLoading and scrolling.
    // If a non-streaming call completed (successfully or with error), we need to add the message and set isLoading/scroll.
    if (!isStreaming || errorOccurred) {
       const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        text: botResponseText,
        sender: errorOccurred ? 'error' : 'bot',
        timestamp: new Date(),
        provider: langchainAgent ? undefined : activeProvider // Si es langchainAgent, dejar undefined
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
