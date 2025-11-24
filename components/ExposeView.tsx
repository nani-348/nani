
import React from 'react';
import { type WindowState } from '../types';

interface ExposeViewProps {
  windows: WindowState[];
  onSelectWindow: (id: number) => void;
  onExit: () => void;
}

export const ExposeView: React.FC<ExposeViewProps> = ({ windows, onSelectWindow, onExit }) => {
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
      onClick={onExit}
    >
      <div className="w-full h-full p-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8 items-center justify-center">
        {windows.map((window, index) => (
          <div
            key={window.id}
            className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-cyan-500/50"
            style={{ animation: `zoomIn 0.3s ease-out ${index * 50}ms forwards`, opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent backdrop click from firing
              onSelectWindow(window.id);
            }}
          >
            {/* Simplified Window Header */}
            <header className="h-7 bg-gray-200 dark:bg-gray-700 flex items-center px-2 flex-shrink-0 rounded-t-lg">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 text-center text-xs font-medium text-gray-800 dark:text-gray-200 truncate px-2">
                {window.title}
              </div>
            </header>
            {/* Simplified Window Body with App Icon */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                <div className="w-1/2 h-1/2 text-gray-700 dark:text-gray-300">
                    {window.app.icon}
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
