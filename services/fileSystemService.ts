import { type CodeFile } from './geminiService';

const STORAGE_KEY = 'macOS_files';

type FileSystem = Record<string, string>;

/**
 * Retrieves all files from localStorage.
 * @returns A record of filenames and their content.
 */
export const getFiles = (): FileSystem => {
    try {
        const storedFiles = localStorage.getItem(STORAGE_KEY);
        return storedFiles ? JSON.parse(storedFiles) : {};
    } catch (error) {
        console.error("Error reading files from localStorage:", error);
        return {};
    }
};

/**
 * Saves a file to localStorage.
 * @param fileName The name of the file to save.
 * @param content The content of the file.
 */
export const saveFile = (fileName: string, content: string): void => {
    try {
        const allFiles = getFiles();
        allFiles[fileName] = content;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiles));
    } catch (error) {
        // Fix: Added error handling to catch storage quota exceeded errors and alert the user.
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
            console.error("Error saving file to localStorage: Quota exceeded.", error);
            alert(`Error saving "${fileName}": Your browser's local storage is full. Please free up space in the File Manager.`);
        } else {
            console.error("Error saving file to localStorage:", error);
            alert(`An unexpected error occurred while saving "${fileName}".`);
        }
    }
};


/**
 * Saves multiple project files to localStorage in a single, more efficient operation.
 * @param files An array of CodeFile objects to save.
 */
export const saveCodeFiles = (files: CodeFile[]): void => {
    try {
        const allFiles = getFiles();
        files.forEach(file => {
            allFiles[file.fileName] = file.code;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiles));
    } catch (error) {
        if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
            console.error("Error saving files to localStorage: Quota exceeded.", error);
            alert("Error saving project: Your browser's local storage is full. Please free up space in the File Manager.");
        } else {
            console.error("Error saving files to localStorage:", error);
            alert("An unexpected error occurred while saving the project files.");
        }
    }
};


/**
 * Reads the content of a single file from localStorage.
 * @param fileName The name of the file to read.
 * @returns The content of the file or null if not found.
 */
export const readFile = (fileName: string): string | null => {
    const allFiles = getFiles();
    return allFiles[fileName] || null;
};

/**
 * Deletes a file from localStorage.
 * @param fileName The name of the file to delete.
 */
export const deleteFile = (fileName: string): void => {
    try {
        const allFiles = getFiles();
        delete allFiles[fileName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allFiles));
    } catch (error) {
        console.error("Error deleting file from localStorage:", error);
    }
};