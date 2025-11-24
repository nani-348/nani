
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generatePortfolioFromResume, generateOrModifyCode, generatePortfolioFromText, type CodeFile } from '../../services/geminiService';
import * as fileSystemService from '../../services/fileSystemService';
import JSZip from 'jszip';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
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

const loadingMessages = [
    "Analyzing your resume...",
    "Extracting key skills and experience...",
    "Designing a professional layout...",
    "Building your project showcase...",
    "Writing your personal summary...",
    "Adding interactive elements...",
    "Finalizing your personal portfolio site..."
];

type ViewState = 'upload' | 'loading' | 'editor';
interface ConversationMessage {
  key: number;
  role: 'user' | 'ai';
  text: string;
}

export const PortfolioMaker: React.FC = () => {
    const [viewState, setViewState] = useState<ViewState>('upload');
    const [files, setFiles] = useState<CodeFile[]>([]);
    const [openTabs, setOpenTabs] = useState<string[]>([]);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const [modificationPrompt, setModificationPrompt] = useState('');
    const [isModifying, setIsModifying] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [conversation, setConversation] = useState<ConversationMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [previewContent, setPreviewContent] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mobileTab, setMobileTab] = useState<'chat' | 'preview'>('chat');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [conversation]);

    useEffect(() => {
        const isLoading = viewState === 'loading' || isModifying;
        let intervalId: number | undefined;
        if (isLoading) {
            setLoadingMessage(loadingMessages[0]);
            intervalId = window.setInterval(() => {
                setLoadingMessage(prev => {
                    const currentIndex = loadingMessages.indexOf(prev);
                    const nextIndex = (currentIndex + 1) % loadingMessages.length;
                    return loadingMessages[nextIndex];
                });
            }, 2500);
        }
        return () => clearInterval(intervalId);
    }, [viewState, isModifying]);

    useEffect(() => {
        const htmlFile = files.find(f => f.fileName.toLowerCase() === 'index.html');
        if (!htmlFile) {
            setPreviewContent('<body style="display: flex; justify-content: center; align-items: center; height: 100%; font-family: sans-serif; color: #555;">No index.html to preview.</body>');
            return;
        }

        const cssFiles = files.filter(f => f.fileName.endsWith('.css'));
        const jsFiles = files.filter(f => f.fileName.endsWith('.js'));
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlFile.code, 'text/html');

        doc.querySelectorAll('style, link[rel="stylesheet"], script').forEach(el => el.remove());
        cssFiles.forEach(file => {
            const style = doc.createElement('style');
            style.textContent = file.code;
            doc.head.appendChild(style);
        });
        jsFiles.forEach(file => {
            const script = doc.createElement('script');
            script.textContent = file.code;
            doc.body.appendChild(script);
        });
        
        setPreviewContent(doc.documentElement.outerHTML);
    }, [files]);
    
    const activeFileContent = useMemo(() => files.find(f => f.fileName === activeTab)?.code || '', [files, activeTab]);
    const hasPreview = useMemo(() => files.some(f => f.fileName.toLowerCase() === 'index.html'), [files]);

    const handleFileDrop = async (droppedFiles: FileList) => {
        const file = droppedFiles[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            setError(null);
            setViewState('loading');
            setConversation([{ key: Date.now(), role: 'ai', text: 'Analyzing your resume to create a portfolio...' }]);
            
            try {
                const { base64, mimeType } = await fileToBase64(file);
                const generatedFiles = await generatePortfolioFromResume(base64, mimeType);

                if (generatedFiles.length > 0 && generatedFiles[0].fileName !== 'error.txt') {
                    setFiles(generatedFiles);
                    fileSystemService.saveCodeFiles(generatedFiles);
                    
                    const newTabs = generatedFiles.map(f => f.fileName);
                    setOpenTabs(newTabs);
                    setActiveTab(generatedFiles.find(f => f.fileName.toLowerCase() === 'index.html')?.fileName || newTabs[0]);
                    
                    setConversation(prev => [...prev, { key: Date.now()+1, role: 'ai', text: 'Success! Here is your new portfolio website. You can ask for changes in the chat.' }]);
                    if(window.innerWidth < 1024) setMobileTab('preview');
                    setViewState('editor');
                } else {
                    throw new Error(generatedFiles[0]?.code || 'Failed to generate files.');
                }
            } catch (err) {
                console.error(err);
                const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
                setError(`Failed to generate portfolio: ${errorMessage}`);
                setConversation(prev => [...prev, { key: Date.now()+1, role: 'ai', text: `Oh no, something went wrong. ${errorMessage}` }]);
                setViewState('upload');
            }
        } else {
            setError('Please drop an image file (e.g., PNG, JPG) or PDF of your resume.');
        }
    };

    const handleTextSubmit = async () => {
        if (!textInput.trim()) {
            setError('Please describe the portfolio you want to create.');
            return;
        }
        setError(null);
        setViewState('loading');
        setConversation([{ key: Date.now(), role: 'ai', text: 'Building your portfolio from your description...' }]);

        try {
            const generatedFiles = await generatePortfolioFromText(textInput);

            if (generatedFiles.length > 0 && generatedFiles[0].fileName !== 'error.txt') {
                setFiles(generatedFiles);
                fileSystemService.saveCodeFiles(generatedFiles);
                
                const newTabs = generatedFiles.map(f => f.fileName);
                setOpenTabs(newTabs);
                setActiveTab(generatedFiles.find(f => f.fileName.toLowerCase() === 'index.html')?.fileName || newTabs[0]);
                
                setConversation(prev => [...prev, { key: Date.now() + 1, role: 'ai', text: 'Success! Here is your new portfolio website. You can ask for changes in the chat.' }]);
                if(window.innerWidth < 1024) setMobileTab('preview');
                setViewState('editor');
            } else {
                throw new Error(generatedFiles[0]?.code || 'Failed to generate files.');
            }
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate portfolio: ${errorMessage}`);
            setConversation(prev => [...prev, { key: Date.now() + 1, role: 'ai', text: `Oh no, something went wrong. ${errorMessage}` }]);
            setViewState('upload');
        }
    };


    const handleModificationSubmit = async () => {
        if (!modificationPrompt || isModifying) return;
        
        setIsModifying(true);
        const currentPrompt = modificationPrompt;
        setConversation(prev => [...prev, { key: Date.now(), role: 'user', text: currentPrompt }]);
        setModificationPrompt('');

        try {
            const updatedFiles = await generateOrModifyCode(currentPrompt, files);
            if (updatedFiles.length > 0 && updatedFiles[0].fileName !== 'error.txt') {
                setFiles(updatedFiles);
                fileSystemService.saveCodeFiles(updatedFiles);
                setConversation(prev => [...prev, { key: Date.now()+1, role: 'ai', text: 'I\'ve updated the code with your changes.' }]);
            } else {
                throw new Error(updatedFiles[0]?.code || 'Failed to apply modifications.');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setConversation(prev => [...prev, { key: Date.now()+1, role: 'ai', text: `Sorry, I couldn't make that change. ${errorMessage}` }]);
        } finally {
            setIsModifying(false);
        }
    };
    
    const handleFileSelect = (fileName: string) => {
        if (!openTabs.includes(fileName)) setOpenTabs(prev => [...prev, fileName]);
        setActiveTab(fileName);
    };

    const handleTabClose = (fileNameToClose: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const tabIndex = openTabs.indexOf(fileNameToClose);
        const newTabs = openTabs.filter(tab => tab !== fileNameToClose);
        setOpenTabs(newTabs);
        if (activeTab === fileNameToClose) {
            setActiveTab(newTabs.length > 0 ? newTabs[Math.max(0, tabIndex - 1)] : null);
        }
    };

    const handleDownload = async () => {
        const zip = new JSZip();
        files.forEach(file => zip.file(file.fileName, file.code));
        const blob = await zip.generateAsync({ type: 'blob' }) as Blob;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'portfolio-project.zip';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleOpenPreviewInNewTab = () => {
        if (!previewContent || !hasPreview) return;
        const blob = new Blob([previewContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const renderUploadView = () => (
        <div 
            className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-800 p-8 text-center overflow-y-auto"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
        >
            <div className={`w-full max-w-2xl p-10 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/50' : 'border-gray-300 dark:border-gray-600'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">Create Your Portfolio Instantly</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Upload an image or PDF of your resume...</p>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-6 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 transition-colors"
                >
                    Upload Resume
                </button>
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && handleFileDrop(e.target.files)} className="hidden" accept="image/*,.pdf" />
                
                <div className="my-8 flex items-center">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400 font-semibold">OR</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <p className="mt-2 text-gray-600 dark:text-gray-400">...describe the portfolio you want to build.</p>
                <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="e.g., 'A portfolio for a web developer named Jane Doe, with projects in React and Node.js. Highlight skills in TypeScript and AWS...'"
                    className="w-full mt-4 p-3 h-32 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-left resize-y"
                />
                <button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim()}
                    className="mt-4 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Generate from Text
                </button>

                {error && <p className="mt-6 text-red-500">{error}</p>}
            </div>
        </div>
    );

    const renderLoadingView = () => (
         <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center">
            <div className="w-48 h-48 relative mb-6">
                <div className="absolute inset-0 border-4 border-sky-500/50 rounded-full animate-pulse"></div>
                <div className="absolute inset-4 border-4 border-sky-500/50 rounded-full animate-pulse [animation-delay:-0.4s]"></div>
                <div className="absolute inset-8 border-4 border-sky-500/50 rounded-full animate-pulse [animation-delay:-0.8s]"></div>
                <div className="absolute inset-0 flex items-center justify-center text-sky-400 font-mono text-5xl">
                    <span className="animate-pulse [animation-delay:-1s]">{'</>'}</span>
                </div>
            </div>
            <h3 className="text-xl font-bold text-white">AI is building your portfolio...</h3>
            <p className="text-gray-300 mt-2 transition-all duration-500 w-64 text-center">{loadingMessage}</p>
        </div>
    );
    
    const renderEditorView = () => (
        <div className="flex flex-col lg:flex-row h-full bg-[#1e1e1e] text-gray-300 font-mono relative">
            {isModifying && renderLoadingView()}
            
             {/* Mobile Tab Bar */}
            <div className="lg:hidden flex border-b border-gray-700 bg-[#252526] sticky top-0 z-20 flex-shrink-0">
                <button onClick={() => setMobileTab('chat')} className={`flex-1 p-3 text-sm font-semibold ${mobileTab === 'chat' ? 'text-white border-b-2 border-sky-500 bg-[#333]' : 'text-gray-400'}`}>Chat</button>
                <button onClick={() => setMobileTab('preview')} className={`flex-1 p-3 text-sm font-semibold ${mobileTab === 'preview' ? 'text-white border-b-2 border-sky-500 bg-[#333]' : 'text-gray-400'}`}>Preview</button>
            </div>

            {/* Left Panel (Chat) */}
            <div className={`w-full lg:w-[350px] bg-[#252526] flex-col border-r border-gray-700 flex-shrink-0 h-full lg:flex ${mobileTab === 'chat' ? 'flex' : 'hidden'}`}>
                <div className="flex-grow flex flex-col p-2 overflow-hidden">
                    <h3 className="text-xs uppercase font-bold text-gray-500 px-2 mb-2 flex-shrink-0">Conversation</h3>
                    <div className="flex-grow overflow-y-auto space-y-4 p-2">
                         {conversation.map((msg, i) => (
                            <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'ai' && <div className="w-6 h-6 text-xs rounded-full bg-sky-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">AI</div>}
                                <div className={`p-2 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-gray-600' : 'bg-gray-700/60'}`}>{msg.text}</div>
                                {msg.role === 'user' && <div className="w-6 h-6 text-xs rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">U</div>}
                            </div>
                         ))}
                         <div ref={messagesEndRef} />
                    </div>
                </div>
                <div className="p-3 border-t border-gray-700 flex-shrink-0">
                    <textarea value={modificationPrompt} onChange={(e) => setModificationPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isModifying && handleModificationSubmit())} placeholder="Ask for modifications..." className="w-full p-2 h-24 bg-[#1e1e1e] border border-gray-600 rounded-md focus:ring-2 focus:ring-sky-500 focus:outline-none text-sm resize-none" disabled={isModifying} />
                    <button onClick={handleModificationSubmit} disabled={isModifying || !modificationPrompt} className="w-full mt-2 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-gray-500 flex justify-center">{isModifying ? 'Applying...' : 'Submit'}</button>
                </div>
            </div>

            {/* Right Panel (Preview & Code) */}
            <div className={`flex-grow flex-col relative h-full lg:flex ${mobileTab === 'preview' ? 'flex' : 'hidden'}`}>
                <div className="bg-[#252526] flex items-center justify-between border-b border-gray-700 flex-shrink-0">
                    <div className="flex overflow-x-auto">
                        {openTabs.map(tabName => (
                            <div key={tabName} onClick={() => setActiveTab(tabName)} className={`flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer border-r border-gray-700 flex-shrink-0 ${activeTab === tabName ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] text-gray-400'}`}>
                                <span className="truncate max-w-xs">{tabName}</span>
                                <button onClick={(e) => handleTabClose(tabName, e)} className="ml-3 text-gray-500 hover:text-white rounded-full p-0.5 hover:bg-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                            </div>
                        ))}
                    </div>
                    <button onClick={handleDownload} title="Download Project as ZIP" className="mr-2 text-gray-400 hover:text-white p-1 flex-shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                </div>
                <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
                    <pre className="w-full h-full p-4 overflow-auto text-sm bg-[#1e1e1e] hidden lg:block"><code className="whitespace-pre-wrap">{activeFileContent}</code></pre>
                    <div className="relative bg-white border-l border-gray-700 overflow-hidden h-full w-full">
                        {hasPreview && <button onClick={handleOpenPreviewInNewTab} className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-800 border border-gray-300 rounded-md hover:bg-gray-200 z-20" title="Open preview in new tab"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></button>}
                        <iframe srcDoc={previewContent} title="Preview" sandbox="allow-scripts allow-same-origin" className="w-full h-full border-0"/>
                    </div>
                </div>
            </div>
        </div>
    );
    
    switch (viewState) {
        case 'loading':
            return <div className="relative h-full">{renderLoadingView()}</div>;
        case 'editor':
            return renderEditorView();
        case 'upload':
        default:
            return renderUploadView();
    }
};
