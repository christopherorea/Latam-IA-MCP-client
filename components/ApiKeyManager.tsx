import React, { useState, useEffect } from 'react';
import { ApiKeys, LLMProvider } from '../types';
import { KeyIcon, OpenAiIcon, ClaudeIcon, GeminiIcon, BrainIcon, CheckCircleIcon } from '../constants';

interface ApiKeyManagerProps {
  apiKeys: ApiKeys;
  onApiKeysChange: (keys: ApiKeys) => void;
  activeLLMProvider: LLMProvider;
  onLLMProviderChange: (provider: LLMProvider) => void;
  keysLoadedFromStorage: boolean;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ 
  apiKeys, 
  onApiKeysChange,
  activeLLMProvider,
  onLLMProviderChange,
  keysLoadedFromStorage
}) => {
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [showClaudeKey, setShowClaudeKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showLoadedMessage, setShowLoadedMessage] = useState(keysLoadedFromStorage);

  useEffect(() => {
    setShowLoadedMessage(keysLoadedFromStorage);
  }, [keysLoadedFromStorage]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onApiKeysChange({
      ...apiKeys,
      [name]: value
    });
  };

  const InputField: React.FC<{
    id: keyof ApiKeys;
    label: string;
    show: boolean;
    setShow: (show: boolean) => void;
  }> = ({ id, label, show, setShow }) => (
    <div className="mb-6">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          id={id}
          name={id}
          value={apiKeys[id] || ''} // Use apiKeys directly
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors"
          placeholder={`Enter your ${label}`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-sky-400"
          aria-label={show ? "Hide key" : "Show key"}
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          )}
        </button>
      </div>
    </div>
  );

  const providerOptions: { id: LLMProvider, label: string, Icon: React.FC<{className?: string}> }[] = [
    { id: 'gemini', label: 'Gemini', Icon: GeminiIcon },
    { id: 'openai', label: 'OpenAI', Icon: OpenAiIcon },
    { id: 'claude', label: 'Claude', Icon: ClaudeIcon },
  ];

  return (
    <div className="p-6 bg-gray-800 rounded-xl shadow-xl">
      <h2 className="text-2xl font-semibold text-sky-400 mb-6 flex items-center">
        <KeyIcon className="mr-3 text-sky-400" /> API Key Management
      </h2>

      {showLoadedMessage && (
        <div 
          className="mb-4 p-3 bg-green-800/50 border border-green-700 rounded-lg text-green-300 text-sm flex justify-between items-center"
          role="alert"
        >
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 mr-2 text-green-400" />
            Previously saved API keys have been loaded from your browser.
          </div>
          <button 
            onClick={() => setShowLoadedMessage(false)} 
            className="text-green-300 hover:text-green-100"
            aria-label="Dismiss message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      
      <div className="space-y-4 mb-8">
        <InputField id="openai" label="OpenAI API Key" show={showOpenAiKey} setShow={setShowOpenAiKey} />
        <InputField id="claude" label="Claude API Key" show={showClaudeKey} setShow={setShowClaudeKey} />
        <InputField id="gemini" label="Gemini API Key (User-provided)" show={showGeminiKey} setShow={setShowGeminiKey} />
      </div>

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-200 mb-3 flex items-center">
          <BrainIcon className="mr-2 text-sky-400" /> Select Chat Provider
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {providerOptions.map(provider => {
            const isKeySet = !!apiKeys[provider.id]?.trim();
            const isActive = activeLLMProvider === provider.id;
            return (
              <button
                key={provider.id}
                onClick={() => onLLMProviderChange(provider.id)}
                disabled={!isKeySet}
                className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all duration-150 ease-in-out
                            ${isActive 
                              ? 'bg-sky-500 border-sky-400 text-white shadow-lg scale-105' 
                              : isKeySet 
                                ? 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-sky-500 text-gray-200' 
                                : 'bg-gray-700/50 border-gray-600 text-gray-500 cursor-not-allowed'}`}
                aria-pressed={isActive}
                aria-label={`Select ${provider.label} as chat provider ${!isKeySet ? '(API key not set)' : ''}`}
              >
                <provider.Icon className={`mr-2 h-5 w-5 ${isActive ? '' : isKeySet ? 'text-sky-300': 'text-gray-500'}`} />
                <span className="font-medium text-sm">{provider.label}</span>
              </button>
            );
          })}
        </div>
        {!apiKeys[activeLLMProvider]?.trim() && (
          <p className="text-xs text-yellow-400 mt-2 text-center">
            The selected provider ({activeLLMProvider}) has no API key. Chat will be disabled.
          </p>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-4 text-center">
        <span className="font-semibold">Security Note:</span> API keys are stored in your browser's local storage. Avoid using shared or public computers.
      </p>
       <p className="text-xs text-gray-500 mt-1 text-center">
        The "Gemini API Key" field is for a user-provided key. If you have `process.env.API_KEY` configured for Gemini, it may be used by the SDK directly if this field is empty, depending on service logic.
      </p>
    </div>
  );
};

export default ApiKeyManager;
