
import React, { useState, useRef } from 'react';
import { editImage } from '../../services/geminiService';

const fileToBase64 = (file: File): Promise<{base64: string, mimeType: string}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve({ base64, mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
};

export const ImageStudio: React.FC = () => {
    const [originalImage, setOriginalImage] = useState<File | null>(null);
    const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
    const [editedImage, setEditedImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setOriginalImage(file);
            setOriginalImagePreview(URL.createObjectURL(file));
            setEditedImage(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!originalImage || !prompt) {
            setError('Please upload an image and provide an editing instruction.');
            return;
        }
        setIsLoading(true);
        setEditedImage(null);
        setError(null);

        try {
            const { base64, mimeType } = await fileToBase64(originalImage);
            const resultBase64 = await editImage(base64, mimeType, prompt);
            setEditedImage(`data:${mimeType};base64,${resultBase64}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!editedImage) return;
        const link = document.createElement('a');
        link.href = editedImage;
        link.download = `edited-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100">
            <div className="flex-grow p-4 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto">
                {/* Original Image */}
                <div className="flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-2">Original</h2>
                    <div 
                        className="w-full h-full flex-grow border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-300/50 dark:hover:bg-gray-600/50"
                        onClick={() => fileInputRef.current?.click()}
                    >
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                         {originalImagePreview ? (
                            <img src={originalImagePreview} alt="Original" className="max-w-full max-h-full object-contain rounded-md"/>
                         ) : (
                            <div className="text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <p>Click to upload an image</p>
                            </div>
                         )}
                    </div>
                </div>

                {/* Edited Image */}
                <div className="flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg p-4 relative group">
                    <h2 className="text-lg font-semibold mb-2">Edited</h2>
                     <div className="w-full h-full flex-grow border-2 border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 bg-white dark:bg-gray-900 overflow-hidden relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-2">Editing your image...</p>
                            </div>
                        ) : editedImage ? (
                            <>
                                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain rounded-md"/>
                                <button 
                                    onClick={handleDownload}
                                    className="absolute bottom-2 right-2 p-2 bg-white/90 text-gray-800 rounded-full shadow-lg hover:bg-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Download Image"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                             <p>Your edited image will appear here.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 p-3 border-t border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-900/50">
                 {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerate()}
                        placeholder="e.g., 'Add a retro filter' or 'Make the sky blue'"
                        className="flex-grow p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    {editedImage && (
                        <button
                            onClick={handleDownload}
                            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center font-semibold space-x-2"
                            title="Download Edited Image"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span>Download</span>
                        </button>
                    )}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !originalImage || !prompt}
                        className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.293 3.293a1 1 0 011.414 1.414l-9 9a1 1 0 01-.39.242l-3 1a1 1 0 01-1.242-1.242l1-3a1 1 0 01.242-.39l9-9zM19 2a1 1 0 00-1-1h-.002a1 1 0 00-.706.293L8.68 9.901l-1.39-1.39a1 1 0 00-1.414 1.414l1.39 1.39-7.9 2.633a1 1 0 00.707 1.854l2.633-7.9 1.39 1.39a1 1 0 001.414-1.414L9.901 8.68 17.293 1.293A1 1 0 0017.002 1H18a1 1 0 001-1z" />
                        </svg>
                        Generate
                    </button>
                </div>
            </div>
        </div>
    );
};
