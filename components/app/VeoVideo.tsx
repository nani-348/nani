import React, { useState, useEffect, useRef } from 'react';
import { generateVideo } from '../../services/geminiService';

// Define local interface to avoid global type conflicts
interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
};

export const VeoVideo: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Helper to safely access aistudio from window
    const getAIStudio = (): AIStudioClient | undefined => (window as any).aistudio;

    useEffect(() => {
        const checkApiKey = async () => {
            const aiStudio = getAIStudio();
            if (aiStudio) {
                if(await aiStudio.hasSelectedApiKey()){
                    setApiKeySelected(true);
                }
            } else {
                // In a deployed environment (like Netlify or Vercel), we assume the API key is 
                // provided via environment variables (process.env.API_KEY).
                // We set this to true to allow the app to attempt the API call.
                setApiKeySelected(true);
            }
        };
        checkApiKey();
    }, []);

    const handleSelectKey = async () => {
        const aiStudio = getAIStudio();
        if(aiStudio){
            await aiStudio.openSelectKey();
            setApiKeySelected(true);
            setError(null);
        }
    };
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setVideoUrl(null);
            setError(null);
        }
    };

    const handleGenerate = async () => {
        if (!imageFile || !prompt) {
            setError('Please provide an image and a prompt.');
            return;
        }
        setIsLoading(true);
        setVideoUrl(null);
        setError(null);
        
        const loadingMessages = [
            "Warming up the digital director's chair...",
            "Choreographing pixels into motion...",
            "Rendering your masterpiece, frame by frame...",
            "This can take a few minutes. Great art needs patience!",
            "Almost there, adding the final touches..."
        ];

        setLoadingMessage(loadingMessages[0]);
        const intervalId = setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                return loadingMessages[nextIndex];
            });
        }, 5000);

        try {
            const base64Data = await fileToBase64(imageFile);
            const resultUrl = await generateVideo(prompt, base64Data, imageFile.type, aspectRatio);
            setVideoUrl(resultUrl);
        } catch (e) {
            const err = e as Error;
            setError(err.message);
            if (err.message.includes("API key is invalid") || err.message.includes("Requested entity was not found")) {
              setApiKeySelected(false);
            }
        } finally {
            setIsLoading(false);
            clearInterval(intervalId);
            setLoadingMessage('');
        }
    };

    if (!apiKeySelected) {
        const isAIStudio = typeof window !== 'undefined' && !!getAIStudio();

        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-100 dark:bg-gray-800 p-8 text-center text-gray-800 dark:text-gray-200">
                <h2 className="text-2xl font-bold mb-4">API Key Required</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-400">
                    {isAIStudio 
                        ? "Video generation with Veo requires a project-linked API key. Please select your key to continue."
                        : "Video generation with Veo requires a valid API_KEY environment variable. Please check your deployment settings."}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">This ensures that you are aware of potential billing. For more info, see the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">billing documentation</a>.</p>
                
                {isAIStudio ? (
                    <button 
                        onClick={handleSelectKey}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        Select API Key
                    </button>
                ) : (
                    <button 
                        onClick={() => setApiKeySelected(true)}
                        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors"
                    >
                        Retry Connection
                    </button>
                )}
                 {error && <p className="text-red-500 mt-4">{error}</p>}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-4 space-y-4 overflow-y-auto">
            <div 
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-md" />
                ) : (
                    <div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload an image</p>
                    </div>
                )}
            </div>

            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what should happen in the video..."
                className="w-full p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                rows={3}
                disabled={isLoading}
            />
            
            <div className="flex items-center space-x-4">
                <span className="font-medium">Aspect Ratio:</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="aspectRatio" value="16:9" checked={aspectRatio === '16:9'} onChange={() => setAspectRatio('16:9')} disabled={isLoading} className="form-radio h-4 w-4 text-blue-600"/>
                    <span>16:9 (Landscape)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="aspectRatio" value="9:16" checked={aspectRatio === '9:16'} onChange={() => setAspectRatio('9:16')} disabled={isLoading} className="form-radio h-4 w-4 text-blue-600"/>
                    <span>9:16 (Portrait)</span>
                </label>
            </div>

            <button
                onClick={handleGenerate}
                disabled={isLoading || !imageFile || !prompt}
                className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
                {isLoading ? 'Generating...' : 'Generate Video'}
            </button>
            
            {isLoading && (
                <div className="text-center p-4 rounded-md bg-gray-100 dark:bg-gray-700">
                    <svg className="animate-spin mx-auto h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{loadingMessage}</p>
                </div>
            )}

            {error && <p className="text-red-500 text-center">{error}</p>}

            {videoUrl && (
                <div className="mt-4">
                    <video src={videoUrl} controls autoPlay loop className="w-full rounded-lg shadow-md" />
                    <a href={videoUrl} download="generated-video.mp4" className="block text-center mt-2 text-blue-600 hover:underline">Download Video</a>
                </div>
            )}
        </div>
    );
};