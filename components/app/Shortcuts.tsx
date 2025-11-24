import React, { useState, useEffect, useCallback } from 'react';
import * as shortcutsService from '../../services/shortcutsService';
import { type Shortcut, type AppName } from '../../types';
import { APPS } from '../../constants';

const formatKeys = (keys: Shortcut['keys']): string => {
    const parts = [];
    if (keys.metaKey) parts.push('Cmd');
    if (keys.ctrlKey) parts.push('Ctrl');
    if (keys.altKey) parts.push('Alt');
    if (keys.shiftKey) parts.push('Shift');
    if (keys.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(keys.key)) {
        parts.push(keys.key.toUpperCase());
    }
    return parts.join(' + ');
};

const initialKeyState: Shortcut['keys'] = {
    ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, key: ''
};

export const Shortcuts: React.FC = () => {
    const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
    const [newShortcutKeys, setNewShortcutKeys] = useState<Shortcut['keys']>(initialKeyState);
    const [selectedApp, setSelectedApp] = useState<AppName>(APPS[0]?.name || 'Finder');
    const [isRecording, setIsRecording] = useState(false);

    const loadShortcuts = useCallback(() => {
        setShortcuts(shortcutsService.getShortcuts());
    }, []);

    useEffect(() => {
        loadShortcuts();
    }, [loadShortcuts]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const { ctrlKey, altKey, shiftKey, metaKey, key } = e;
        // Ignore modifier-only key presses
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return;

        setNewShortcutKeys({ ctrlKey, altKey, shiftKey, metaKey, key });
        setIsRecording(false);
    };

    const handleAddShortcut = () => {
        if (!newShortcutKeys.key) return;

        const newShortcut: Shortcut = {
            id: Date.now().toString(),
            keys: newShortcutKeys,
            action: { type: 'OPEN_APP', appName: selectedApp }
        };
        shortcutsService.addShortcut(newShortcut);
        setNewShortcutKeys(initialKeyState);
        loadShortcuts();
    };

    const handleDeleteShortcut = (id: string) => {
        shortcutsService.deleteShortcut(id);
        loadShortcuts();
    };

    const formattedKeyString = formatKeys(newShortcutKeys);
    
    // Filter out apps that shouldn't have shortcuts, like Finder or the Shortcuts app itself
    const availableApps = APPS.filter(app => app.name !== 'Finder' && app.name !== 'Shortcuts');

    return (
        <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <header className="p-4 border-b border-gray-300 dark:border-gray-700 flex-shrink-0">
                <h1 className="text-xl font-semibold">Keyboard Shortcuts</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create shortcuts to open your favorite apps.</p>
            </header>
            
            <div className="flex-grow p-4 overflow-y-auto">
                <h2 className="text-md font-semibold mb-2 text-gray-700 dark:text-gray-300">Add New Shortcut</h2>
                <div className="bg-white/50 dark:bg-gray-700/50 p-3 rounded-lg flex flex-col md:flex-row items-stretch md:items-center space-y-2 md:space-y-0 md:space-x-3">
                    <input
                        id="shortcut-input-definer"
                        type="text"
                        readOnly
                        value={isRecording ? 'Press keys...' : (formattedKeyString || 'Click to set shortcut')}
                        onFocus={() => setIsRecording(true)}
                        onBlur={() => setIsRecording(false)}
                        onKeyDown={handleKeyDown}
                        className="flex-grow p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-center font-mono"
                    />
                    <select
                        value={selectedApp}
                        onChange={(e) => setSelectedApp(e.target.value as AppName)}
                        className="p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                       {availableApps.map(app => (
                           <option key={app.name} value={app.name}>{app.name}</option>
                       ))}
                    </select>
                    <button
                        onClick={handleAddShortcut}
                        disabled={!formattedKeyString}
                        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Add
                    </button>
                </div>

                <h2 className="text-md font-semibold mt-6 mb-2 text-gray-700 dark:text-gray-300">Existing Shortcuts</h2>
                <div className="space-y-2">
                    {shortcuts.length === 0 ? (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">No shortcuts defined yet.</p>
                    ) : (
                        shortcuts.map(shortcut => (
                            <div key={shortcut.id} className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-700/50 rounded-md">
                                <span className="font-mono text-sm bg-gray-300 dark:bg-gray-600 px-2 py-1 rounded">{formatKeys(shortcut.keys)}</span>
                                <span className="text-sm">Opens "{shortcut.action.appName}"</span>
                                <button onClick={() => handleDeleteShortcut(shortcut.id)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};