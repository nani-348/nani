
import React, { useState, useEffect } from 'react';
import { type AppName } from '../types';

interface MenuBarProps {
  activeAppName: AppName;
}

export const MenuBar: React.FC<MenuBarProps> = ({ activeAppName }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-7 bg-white/30 backdrop-blur-xl z-[30000] flex items-center justify-between px-4 text-sm text-black shadow-sm">
      <div className="flex items-center gap-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.5,2.25a2.09,2.09,0,0,0-1.87.9c-.43.68-.82,1.82-.82,1.82s.39-1.14.82-1.82a2.09,2.09,0,0,0,1.87-.9,2.37,2.37,0,0,1,1.17-.45,2.1,2.1,0,0,1,2.15,2.17,4.82,4.82,0,0,1-1.38,3.58,6,6,0,0,1-2.45,2,4,4,0,0,1-1.78.63,3.75,3.75,0,0,1,1.89.65,6.18,6.18,0,0,1,2.56,2.1,4.78,4.78,0,0,1,1.48,3.75,2.1,2.1,0,0,1-2.15,2.17A2.37,2.37,0,0,1,15.67,22a2.09,2.09,0,0,0-1.87-.9c-.43-.68-.82-1.82-.82-1.82s.39,1.14.82,1.82a2.09,2.09,0,0,0,1.87.9,2.37,2.37,0,0,1,1.17.45,2.1,2.1,0,0,1,2.15-2.17,4.82,4.82,0,0,0-1.38-3.58A6,6,0,0,0,15.1,14a4,4,0,0,0-1.78-.63,3.75,3.75,0,0,0,1.89-.65,6.18,6.18,0,0,0,2.56-2.1A4.78,4.78,0,0,0,19.25,7a2.1,2.1,0,0,1-2.15-2.17A2.37,2.37,0,0,1,14.5,2.25Z" transform="translate(-1.4 -0.25)"/>
          <path d="M12.18,10.25a4.42,4.42,0,0,0-3.32,1.64,4.28,4.28,0,0,0-1.3,3.34,4.41,4.41,0,0,0,3.55,4.64,1.82,1.82,0,0,0,.43,0,4.43,4.43,0,0,0,3.32-1.64,4.28,4.28,0,0,0,1.3-3.34A4.33,4.33,0,0,0,12.61,10.25Z" transform="translate(-1.4 -0.25)"/>
        </svg>
        <span className="font-bold px-2 py-0.5 bg-black/10 rounded hidden sm:block">{activeAppName}</span>
      </div>
      <div>{formatTime(time)}</div>
    </header>
  );
};
