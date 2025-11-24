
import React, { useState } from 'react';
import { APPS } from '../constants';
import { type AppName } from '../types';

interface DockProps {
  openApp: (appName: AppName) => void;
  runningApps: AppName[];
}

export const Dock: React.FC<DockProps> = ({ openApp, runningApps }) => {
  const [bouncingApp, setBouncingApp] = useState<AppName | null>(null);
  
  const handleAppClick = (appName: AppName) => {
    setBouncingApp(appName);
    openApp(appName);
    setTimeout(() => setBouncingApp(null), 500); // Match animation duration
  };

  return (
    <footer className="fixed bottom-1 sm:bottom-2 left-1/2 -translate-x-1/2 z-[20000]">
      <div className="flex items-end h-16 sm:h-20 p-1 sm:p-2 space-x-1 sm:space-x-2 bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 overflow-x-auto md:overflow-visible">
        {APPS.map(app => (
          <div key={app.name} className="relative flex flex-col items-center group">
             <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-900/90 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-sm z-[100] backdrop-blur-sm">
              {app.name}
            </div>
            <button
              onClick={() => handleAppClick(app.name)}
              className={`w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl text-white bg-gradient-to-br from-blue-500 to-purple-600 shadow-md transition-transform duration-200 group-hover:-translate-y-2 group-hover:scale-110 active:scale-95 ${
                  bouncingApp === app.name ? 'animate-dock-bounce' : ''
              }`}
            >
              <div className="p-1 sm:p-2">{app.icon}</div>
            </button>
            <div
                className={`w-1.5 h-1.5 rounded-full bg-gray-800 bg-opacity-70 mt-1.5 transition-opacity duration-200 ${
                    runningApps.includes(app.name) ? 'opacity-100' : 'opacity-0'
                }`}
            />
          </div>
        ))}
      </div>
    </footer>
  );
};
