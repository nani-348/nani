
import React, { useState } from 'react';
import { generateText } from '../../services/geminiService';

interface SpeechRecognition {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export const WordProcessor: React.FC = () => {
  const [text, setText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleGenerateText = async () => {
    if (!prompt) return;
    setIsLoading(true);
    const generatedContent = await generateText(`Write a paragraph about: ${prompt}`);
    setText(prevText => prevText ? `${prevText}\n\n${generatedContent}` : generatedContent);
    setIsLoading(false);
    setPrompt('');
  };

  const handleMicClick = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition is not supported in your browser.");
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
    };
    recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
    };

    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 flex items-center space-x-2">
        <div className="relative flex-grow">
            <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a topic..."
            className="w-full p-2 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm md:text-base"
            disabled={isLoading}
            />
            <button 
                onClick={handleMicClick}
                disabled={isLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${isListening ? 'text-red-500 bg-red-100 dark:bg-red-900/30' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                title="Use Voice"
            >
                 {isListening ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        <path d="M10 18a5 5 0 005-5h-2a3 3 0 11-6 0H5a5 5 0 005 5z" />
                    </svg>
                 )}
            </button>
        </div>
        <button
          onClick={handleGenerateText}
          disabled={isLoading || !prompt}
          className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap text-sm md:text-base"
        >
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Write AI'}
        </button>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full h-full p-4 md:p-6 text-base md:text-lg leading-relaxed resize-none focus:outline-none font-serif bg-transparent"
        placeholder="Start writing your document..."
      />
    </div>
  );
};
