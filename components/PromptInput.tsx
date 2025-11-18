
import React, { useState } from 'react';
import { Send, LoaderCircle } from 'lucide-react';

interface PromptInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
}

export const PromptInput: React.FC<PromptInputProps> = ({ onSubmit, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isLoading) {
      onSubmit(prompt);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="prompt-input" className="font-semibold text-gray-400">
        Enter your prompt
      </label>
      <div className="relative">
        <textarea
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., a dark-themed login form with a pulsating button"
          className="w-full h-28 p-3 bg-gray-800 border border-gray-700 rounded-lg resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt}
          className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generate
            </>
          )}
        </button>
      </div>
    </form>
  );
};
