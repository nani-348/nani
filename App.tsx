import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Dock } from './components/Dock';
import { MenuBar } from './components/MenuBar';
import { Window } from './components/Window';
import { PptMaker } from './components/apps/PptMaker';
import { WordProcessor } from './components/apps/WordProcessor';
import { Spreadsheet } from './components/apps/Spreadsheet';
import { Settings } from './components/apps/Settings';
import { VeoVideo } from './components/apps/VeoVideo';
import { CherryAI } from './components/apps/CherryAI';
import { ImageStudio } from './components/apps/ImageStudio';
import { FileManager } from './components/apps/FileManager';
import { Shortcuts } from './components/apps/Shortcuts';
import { Nani } from './components/apps/Nani';
import { ExposeView } from './components/ExposeView';
import { type WindowState, type AppName, type Shortcut, type DesktopItem, type SnapTarget } from './types';
import { APPS } from './constants';
import * as shortcutsService from './services/shortcutsService';
import { playSound } from './services/audioService';
import { Browser } from './components/apps/Browser';
import { Google } from './components/apps/Google';
import { PortfolioMaker } from './components/apps/PortfolioMaker';


const getIconForFile = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    let emoji = '📁';
    switch (extension) {
        case 'html': emoji = '📄'; break;
        case 'css': emoji = '🎨'; break;
        case 'js': emoji = '📜'; break;
        case 'md': emoji = '📝'; break;
        case 'pptx': emoji = '📊'; break;
        case 'json': emoji = '📦'; break;
        case 'txt': emoji = '🗒️'; break;
    }
    return <span className="text-5xl drop-shadow-lg">{emoji}</span>;
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile;
};

const App: React.FC = () => {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [wallpaper, setWallpaper] = useState('https://picsum.photos/seed/macos/2560/1440');
  const [isExposeActive, setIsExposeActive] = useState(false);
  const [desktopItems, setDesktopItems] = useState<DesktopItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [snapPreview, setSnapPreview] = useState<SnapTarget | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  const isMobile = useIsMobile();
  const [activeMobileApp, setActiveMobileApp] = useState<AppName | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
        setIsBooting(false);
        playSound('minimizeOpen'); // Subtle sound on start
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const openApp = useCallback((appName: AppName) => {
    playSound('minimizeOpen');
     if (isMobile) {
        setActiveMobileApp(appName);
        return;
    }

    setWindows(currentWindows => {
      const existingWindow = currentWindows.find(w => w.app.name === appName);
      if (existingWindow) {
        // If app is open, bring it to front and un-minimize it
        const focusedWindows = currentWindows.map(w => w.id === existingWindow.id ? { ...w, zIndex: nextZIndex + 1, minimized: false, minimizing: false } : w);
        setNextZIndex(prev => prev + 1);
        return focusedWindows;
      }
      
      const app = APPS.find(a => a.name === appName);
      if (!app) return currentWindows;

      let size = { width: 800, height: 600 };
      if (appName === 'PowerPoint' || appName === 'Word' || appName === 'Excel' || appName === 'Image Studio' || appName === 'Browser' || appName === 'Google') {
        size = { width: 900, height: 700 };
      } else if (appName === 'Settings' || appName === 'Shortcuts') {
        size = { width: 600, height: 450 };
      } else if (appName === 'Veo Video') {
        size = { width: 700, height: 750 };
      } else if (appName === 'Cherry AI' || appName === 'PortfolioMaker') {
        size = { width: 1024, height: 768 };
      } else if (appName === 'File Manager') {
        size = { width: 700, height: 800 };
      } else if (appName === 'Nani') {
        size = { width: 500, height: 700 };
      }

      const newWindow: WindowState = {
        id: Date.now(),
        app,
        title: app.name,
        position: { x: Math.random() * 200 + 150, y: Math.random() * 100 + 50 },
        size,
        zIndex: nextZIndex,
        minimized: false,
        minimizing: false,
        isFullScreen: false,
      };
      setNextZIndex(prev => prev + 1);
      return [...currentWindows, newWindow];
    });
  }, [nextZIndex, isMobile]);
  
  // Global shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Don't trigger shortcuts if the user is typing in an input/textarea
        const target = e.target as HTMLElement;
        
        // Exposé shortcut (should work even in inputs)
        if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
            e.preventDefault();
            setIsExposeActive(prev => !prev);
            return;
        }

        if (e.key === 'Escape' && isExposeActive) {
            e.preventDefault();
            setIsExposeActive(false);
            return;
        }

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            // Allow shortcuts from the shortcut definition input though
            if(target.id !== 'shortcut-input-definer') return;
        }

        const shortcuts = shortcutsService.getShortcuts();
        const matchedShortcut = shortcuts.find(s =>
            s.keys.ctrlKey === e.ctrlKey &&
            s.keys.altKey === e.altKey &&
            s.keys.shiftKey === e.shiftKey &&
            s.keys.metaKey === e.metaKey &&
            s.keys.key.toLowerCase() === e.key.toLowerCase()
        );

        if (matchedShortcut) {
            e.preventDefault();
            if (matchedShortcut.action.type === 'OPEN_APP') {
                openApp(matchedShortcut.action.appName);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openApp, isExposeActive, isMobile]);

  const closeActiveMobileApp = useCallback(() => {
    playSound('close');
    setActiveMobileApp(null);
  }, []);

  const closeWindow = useCallback((id: number) => {
    if (isMobile) {
        closeActiveMobileApp();
        return;
    }
    playSound('close');
    setWindows(currentWindows =>
      currentWindows.map(w => (w.id === id ? { ...w, closing: true } : w))
    );

    setTimeout(() => {
      setWindows(currentWindows => currentWindows.filter(w => w.id !== id));
    }, 200); // Match animation duration from CSS
  }, [isMobile, closeActiveMobileApp]);
  
  const minimizeWindow = useCallback((id: number) => {
    if (isMobile) {
        closeActiveMobileApp();
        return;
    }
    playSound('minimizeOpen');
    setWindows(currentWindows => currentWindows.map(w => w.id === id ? { ...w, minimizing: true } : w));
    
    setTimeout(() => {
        setWindows(currentWindows => currentWindows.map(w => w.id === id ? { ...w, minimized: true, minimizing: false } : w))
    }, 400); // Duration of the animation
  }, [isMobile, closeActiveMobileApp]);

  const focusWindow = useCallback((id: number) => {
    if (isMobile) return;
    setWindows(currentWindows => {
        return currentWindows.map(w => w.id === id ? { ...w, zIndex: nextZIndex, minimized: false, minimizing: false } : w);
    });
    setNextZIndex(prev => prev + 1);
  }, [nextZIndex, isMobile]);

  const toggleFullScreen = useCallback((id: number) => {
    if (isMobile) return;
    focusWindow(id);
    setWindows(currentWindows =>
      currentWindows.map(w =>
        w.id === id ? { ...w, isFullScreen: !w.isFullScreen } : w
      )
    );
  }, [focusWindow, isMobile]);

  const updateWindowState = useCallback((id: number, updates: Partial<WindowState>) => {
    if(isMobile) return;
    setWindows(currentWindows => currentWindows.map(w => w.id === id ? { ...w, ...updates } : w));
  }, [isMobile]);
  
  const activeWindow = useMemo(() => {
    if (windows.length === 0) return null;
    const unminimizedWindows = windows.filter(w => !w.minimized && !w.minimizing);
    if (unminimizedWindows.length === 0) return null;
    return unminimizedWindows.reduce((top, w) => w.zIndex > top.zIndex ? w : top);
  }, [windows]);

  const activeAppName = isMobile ? activeMobileApp ?? 'Finder' : activeWindow?.app.name ?? 'Finder';
  const activeWindowId = activeWindow?.id;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const isFile = e.dataTransfer.types.includes('application/x-macos-file');
      if (isFile) {
          e.dataTransfer.dropEffect = 'copy';
          setIsDraggingOver(true);
      }
  };

  const handleDragLeave = () => {
      setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDraggingOver(false);
      
      const fileDataString = e.dataTransfer.getData('application/x-macos-file');
      if (fileDataString) {
          try {
              const { name } = JSON.parse(fileDataString);
              // Adjust position to center the icon on the cursor, accounting for menu bar height
              const menuBarHeight = 28;
              const newItem: DesktopItem = {
                  id: Date.now(),
                  name,
                  position: { x: e.clientX - 40, y: e.clientY - menuBarHeight - 40 }
              };
              // Prevent duplicates
              if (!desktopItems.some(item => item.name === newItem.name)) {
                  setDesktopItems(prev => [...prev, newItem]);
              }
          } catch (error) {
              console.error("Failed to parse dropped file data:", error);
          }
      }
  };

  const renderAppContent = (appName: AppName) => {
    switch(appName) {
      case 'PowerPoint':
        return <PptMaker />;
      case 'Word':
        return <WordProcessor />;
      case 'Excel':
        return <Spreadsheet />;
      case 'Nani':
        return <Nani />;
      case 'Settings':
        return <Settings currentWallpaper={wallpaper} onWallpaperChange={setWallpaper} />;
      case 'Veo Video':
        return <VeoVideo />;
      case 'Cherry AI':
        return <CherryAI />;
      case 'Image Studio':
        return <ImageStudio />;
      case 'File Manager':
        return <FileManager />;
      case 'Shortcuts':
        return <Shortcuts />;
      case 'Browser':
        return <Browser />;
      case 'Google':
        return <Google />;
      case 'PortfolioMaker':
        return <PortfolioMaker />;
      default:
        return <div className="p-4">App not found</div>;
    }
  };

  if (isBooting) {
      const cherryApp = APPS.find(a => a.name === 'Cherry AI');
      return (
          <div className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-fade-in select-none cursor-default">
             <div className="transform scale-150 mb-10 animate-bounce">
                 <div className="w-24 h-24">
                    {cherryApp?.icon}
                 </div>
             </div>
             <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-600 tracking-tighter animate-pulse">
                 Welcome to Cherry AI
             </h1>
             <p className="text-gray-500 mt-4 text-sm animate-pulse">Initializing system...</p>
          </div>
      );
  }

  if (isMobile) {
    return (
        <div 
            className={`w-screen h-screen bg-cover bg-center font-sans overflow-hidden relative`}
            style={{ backgroundImage: `url(${wallpaper})`}}
        >
            <MenuBar activeAppName={activeMobileApp || 'Finder'} />
            <main className="w-full h-full overflow-hidden relative pt-7">
                {activeMobileApp ? (
                    <div className="absolute inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900 animate-fade-in">
                        <header className="h-12 bg-gray-200 dark:bg-gray-800 flex items-center px-4 flex-shrink-0 border-b border-gray-300 dark:border-gray-700 shadow-md sticky top-0 z-30 justify-between">
                             <div className="flex items-center gap-3">
                                <button onClick={closeActiveMobileApp} className="flex items-center justify-center bg-blue-500 text-white rounded-full p-1.5 shadow-sm active:bg-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                                <span className="font-bold text-lg truncate text-gray-800 dark:text-white">{activeMobileApp}</span>
                            </div>
                        </header>
                        <div className="flex-1 overflow-hidden relative w-full">
                            {renderAppContent(activeMobileApp)}
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full overflow-y-auto p-4 pb-20 animate-fade-in">
                         <div className="grid grid-cols-4 gap-4 justify-items-center content-start pt-4">
                            {APPS.map((app) => (
                                <button
                                    key={app.name}
                                    onClick={() => openApp(app.name)}
                                    className="flex flex-col items-center w-[72px] group mb-2"
                                >
                                    <div className="w-[60px] h-[60px] rounded-[14px] shadow-xl transition-transform active:scale-95 bg-white/5 backdrop-blur-sm">
                                        <div className="w-full h-full p-0.5">
                                            {app.icon}
                                        </div>
                                    </div>
                                    <span className="mt-1.5 text-[11px] font-medium text-white text-center leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] line-clamp-2 w-full px-0.5 break-words">
                                        {app.name}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
  }

  return (
    <div 
      className={`w-screen h-screen bg-cover bg-center font-sans transition-all duration-500 ${isDraggingOver ? 'outline outline-4 outline-offset-[-4px] outline-blue-500/50' : ''} overflow-hidden`}
      style={{ backgroundImage: `url(${wallpaper})`}}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      <MenuBar activeAppName={activeAppName} />
      <main className={`w-full h-full transition-opacity duration-300 ${isExposeActive ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {desktopItems.map(item => (
            <div
                key={item.id}
                onDoubleClick={() => openApp('File Manager')}
                className="desktop-item absolute flex flex-col items-center justify-center w-24 text-center cursor-pointer group"
                style={{ top: `${item.position.y}px`, left: `${item.position.x}px`, zIndex: 1 }}
            >
                {getIconForFile(item.name)}
                <span className="text-white text-xs font-semibold mt-1 p-1 rounded bg-black/20 group-hover:bg-blue-500/80 truncate w-full">
                    {item.name}
                </span>
            </div>
        ))}
        {windows.map(windowState => 
            <Window
              key={windowState.id}
              state={windowState}
              isActive={windowState.id === activeWindowId}
              onClose={() => closeWindow(windowState.id)}
              onMinimize={() => minimizeWindow(windowState.id)}
              onToggleFullScreen={() => toggleFullScreen(windowState.id)}
              onFocus={() => focusWindow(windowState.id)}
              onUpdate={updates => updateWindowState(windowState.id, updates)}
              onSnapPreview={setSnapPreview}
              style={{ display: windowState.minimized ? 'none' : 'flex' }}
            >
              {renderAppContent(windowState.app.name)}
            </Window>
        )}
      </main>
      {snapPreview && !isExposeActive && (
        <div
          className="fixed bg-white/20 backdrop-blur-sm border-2 border-white/50 rounded-lg transition-all duration-100 ease-in-out"
          style={{
            left: snapPreview.x,
            top: snapPreview.y,
            width: snapPreview.width,
            height: snapPreview.height,
            zIndex: 9998
          }}
        />
      )}
      {isExposeActive && (
        <ExposeView
            windows={windows.filter(w => !w.minimized)}
            onSelectWindow={(id) => {
                focusWindow(id);
                setIsExposeActive(false);
            }}
            onExit={() => setIsExposeActive(false)}
        />
      )}
      <Dock openApp={openApp} runningApps={windows.map(w => w.app.name)} />
    </div>
  );
};

export default App;