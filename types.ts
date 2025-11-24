import React from 'react';

export type AppName = 'PowerPoint' | 'Word' | 'Excel' | 'Finder' | 'Settings' | 'Veo Video' | 'Cherry AI' | 'Image Studio' | 'File Manager' | 'Shortcuts' | 'Nani' | 'Browser' | 'Google' | 'PortfolioMaker';

export interface AppDefinition {
  name: AppName;
  // Fix: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
}

export interface WindowState {
  id: number;
  app: AppDefinition;
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  minimized: boolean;
  minimizing?: boolean;
  isFullScreen: boolean;
  closing?: boolean;
}

export interface Shortcut {
  id: string;
  keys: {
    ctrlKey: boolean;
    altKey: boolean;
    shiftKey: boolean;
    metaKey: boolean; // For Command key on Mac
    key: string;
  };
  action: {
    type: 'OPEN_APP';
    appName: AppName;
  };
}

export interface DesktopItem {
  id: number;
  name: string;
  position: { x: number; y: number };
}

export interface SnapTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  isFullScreen?: boolean;
}