
import React, { useState, useRef } from 'react';

export const Browser: React.FC = () => {
  const [url, setUrl] = useState('https://en.wikipedia.org/wiki/Main_Page');
  const [inputValue, setInputValue] = useState(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleGo = () => {
    let finalUrl = inputValue.trim();
    if (!finalUrl) return;
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = `https://${finalUrl}`;
    }
    setUrl(finalUrl);
    setInputValue(finalUrl);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGo();
    }
  };
  
  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center p-2 bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 flex-shrink-0">
        <div className="flex space-x-1">
          <button className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" title="Back (disabled)" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed" title="Forward (disabled)" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
        <button className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-300 dark:text-gray-200 dark:hover:bg-gray-600 ml-2" onClick={handleRefresh} title="Refresh">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M20 20v-5h-5M4 4a12.94 12.94 0 0115.12 2.88M20 20a12.94 12.94 0 01-15.12-2.88" /></svg>
        </button>
        <div className="flex-grow mx-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-1 text-sm bg-white dark:bg-gray-800 dark:text-gray-200 rounded-md border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="https://example.com"
          />
        </div>
      </div>
      <iframe
        ref={iframeRef}
        src={url}
        className="w-full h-full border-0"
        title="Web Browser"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        onError={() => console.error(`Failed to load ${url}`)}
      />
    </div>
  );
};