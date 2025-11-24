

import React, { useState, useEffect, useCallback } from 'react';
import * as fileSystemService from '../../services/fileSystemService';

const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'html': return '📄';
        case 'css': return '🎨';
        case 'js': return '📜';
        case 'md': return '📝';
        case 'pptx': return '📊';
        case 'json': return '📦';
        case 'txt': return '🗒️';
        default: return '📁';
    }
};

const base64ToBlob = (base64: string, contentType = '', sliceSize = 512) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
};


export const FileManager: React.FC = () => {
    const [files, setFiles] = useState<Record<string, string>>({});
    const [draggingFile, setDraggingFile] = useState<string | null>(null);

    const loadFiles = useCallback(() => {
        setFiles(fileSystemService.getFiles());
    }, []);

    useEffect(() => {
        loadFiles();
        // Add an event listener to update if another tab changes the files
        const handleStorageChange = () => loadFiles();
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [loadFiles]);

    const handleDelete = (fileName: string) => {
        if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
            fileSystemService.deleteFile(fileName);
            loadFiles();
        }
    };

    const handleDownload = (fileName: string, content: string) => {
        let blob;
        const extension = fileName.split('.').pop()?.toLowerCase();

        if (extension === 'pptx') {
            blob = base64ToBlob(content, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        } else {
            blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDragStart = (e: React.DragEvent<HTMLLIElement>, fileName: string, content: string) => {
        setDraggingFile(fileName);
        const fileData = {
            name: fileName,
            content: content, 
        };
        e.dataTransfer.setData('application/x-macos-file', JSON.stringify(fileData));
        e.dataTransfer.effectAllowed = 'copy';
    };


    const fileNames = Object.keys(files).sort();

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <header className="p-3 border-b border-gray-300 dark:border-gray-700 flex-shrink-0 bg-gray-200 dark:bg-gray-900/50">
                <h1 className="text-lg font-semibold">File Manager</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{fileNames.length} items stored in this browser.</p>
            </header>
            <div className="flex-grow p-2 overflow-y-auto">
                {fileNames.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>No files yet. Create something in another app!</p>
                    </div>
                ) : (
                    <ul className="space-y-1">
                        {fileNames.map(fileName => (
                            <li 
                                key={fileName}
                                draggable="true"
                                onDragStart={(e) => handleDragStart(e, fileName, files[fileName])}
                                onDragEnd={() => setDraggingFile(null)}
                                className={`flex items-center justify-between p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 group cursor-grab ${draggingFile === fileName ? 'opacity-50' : ''}`}
                            >
                                <div className="flex items-center space-x-3 truncate">
                                    <span className="text-xl">{getFileIcon(fileName)}</span>
                                    <span className="truncate">{fileName}</span>
                                </div>
                                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => handleDownload(fileName, files[fileName])}
                                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-md" 
                                        title="Download"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(fileName)}
                                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-md" 
                                        title="Delete"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};