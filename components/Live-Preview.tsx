
import React, { useEffect, useState } from 'react';
import { GeneratedCode } from '../types';
import { LoaderCircle } from 'lucide-react';

interface LivePreviewProps {
  code: GeneratedCode;
  isLoading: boolean;
}

export const LivePreview: React.FC<LivePreviewProps> = ({ code, isLoading }) => {
  const [iframeKey, setIframeKey] = useState(0);

  // Force iframe to remount on code change to ensure scripts are re-executed
  useEffect(() => {
    setIframeKey(prev => prev + 1);
  }, [code]);

  const documentContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; }
          ${code.css}
        </style>
      </head>
      <body>
        ${code.html}
        <script>
          try {
            ${code.js}
          } catch (e) {
            console.error(e);
          }
        </script>
      </body>
      </html>
    `;

  return (
    <div className="w-full h-full relative bg-white">
      {isLoading && (
        <div 
          className="absolute inset-0 bg-gray-800/90 backdrop-blur-sm flex items-center justify-center z-10 text-white" 
          role="status" 
          aria-label="Generating code preview"
        >
          <div className="flex items-center gap-3 text-lg">
            <LoaderCircle className="w-6 h-6 animate-spin" />
            <span>Updating Preview...</span>
          </div>
        </div>
      )}
      <iframe
        key={iframeKey}
        srcDoc={documentContent}
        title="Live Code Preview"
        sandbox="allow-scripts allow-forms allow-same-origin"
        className="w-full h-full border-0"
      />
    </div>
  );
};
