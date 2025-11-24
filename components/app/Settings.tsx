
import React from 'react';

interface SettingsProps {
  currentWallpaper: string;
  onWallpaperChange: (url: string) => void;
}

const WALLPAPERS = [
  'https://picsum.photos/seed/macos/2560/1440',
  'https://picsum.photos/seed/windows/2560/1440',
  'https://picsum.photos/seed/linux/2560/1440',
  'https://picsum.photos/seed/nature/2560/1440',
  'https://picsum.photos/seed/space/2560/1440',
  'https://picsum.photos/seed/ocean/2560/1440',
  'https://picsum.photos/seed/mountains/2560/1440',
  'https://picsum.photos/seed/city/2560/1440',
];

export const Settings: React.FC<SettingsProps> = ({ currentWallpaper, onWallpaperChange }) => {
  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-800">
      <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Desktop Wallpaper</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Choose a new wallpaper for your desktop.</p>
      </header>
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {WALLPAPERS.map(url => (
            <button
              key={url}
              onClick={() => onWallpaperChange(url)}
              className={`relative aspect-video rounded-lg overflow-hidden focus:outline-none ring-2 ring-offset-2 ring-offset-gray-200 dark:ring-offset-gray-800 transition-all ${
                currentWallpaper === url ? 'ring-blue-500' : 'ring-transparent hover:ring-blue-400'
              }`}
            >
              <img src={`${url.split('?')[0]}?grayscale&blur=2`} alt="Wallpaper thumbnail" className="w-full h-full object-cover" loading="lazy" />
              {currentWallpaper === url && (
                <div className="absolute inset-0 bg-blue-500 bg-opacity-30 flex items-center justify-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};