import { type Shortcut } from '../types';

const STORAGE_KEY = 'macOS_shortcuts';

/**
 * Retrieves all shortcuts from localStorage.
 * @returns An array of Shortcut objects.
 */
export const getShortcuts = (): Shortcut[] => {
    try {
        const storedShortcuts = localStorage.getItem(STORAGE_KEY);
        return storedShortcuts ? JSON.parse(storedShortcuts) : [];
    } catch (error) {
        console.error("Error reading shortcuts from localStorage:", error);
        return [];
    }
};

/**
 * Saves a new shortcut to localStorage.
 * @param shortcut The shortcut object to add.
 */
export const addShortcut = (shortcut: Shortcut): void => {
    try {
        const allShortcuts = getShortcuts();
        // Prevent duplicates
        const existing = allShortcuts.find(s => s.id === shortcut.id);
        if (!existing) {
            allShortcuts.push(shortcut);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allShortcuts));
        }
    } catch (error) {
        console.error("Error saving shortcut to localStorage:", error);
    }
};

/**
 * Deletes a shortcut from localStorage.
 * @param shortcutId The ID of the shortcut to delete.
 */
export const deleteShortcut = (shortcutId: string): void => {
    try {
        const allShortcuts = getShortcuts();
        const filteredShortcuts = allShortcuts.filter(s => s.id !== shortcutId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredShortcuts));
    } catch (error) {
        console.error("Error deleting shortcut from localStorage:", error);
    }
};
