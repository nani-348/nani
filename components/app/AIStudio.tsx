
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generateOrModifyCode, type CodeFile } from '../../services/geminiService';
import JSZip from 'jszip';


const initialFiles: CodeFile[] = [
    {
        fileName: 'welcome.md',
        code: `# Welcome to the new AI Studio!

Enter a prompt to the left to generate a complete project.
After that, you can enter more prompts to modify the code.

For example, try:
- "A simple HTML page with a counter button"
- Then, "Change the button color to blue"`
    }
];

const loadingMessages = [
    "Analyzing your request...",
    "Drafting the file structure...",
    "Writing HTML scaffolding...",
    "Applying CSS styles...",
    "Adding JavaScript logic...",
    "Assembling the project...",
    "Almost ready..."
];

interface ConversationMessage {
  key: number;
  role: 'user' | 'ai';
  text: string;
}

export const AIStudio: React.FC = () => {
  const [files, setFiles] = useState<CodeFile[]>(initialFiles);
  const [openTabs, setOpenTabs] = useState<string[]>(['welcome.md']);
  const [activeTab, setActiveTab] = useState<string | null>('welcome.md');
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    { key: 0, role: 'ai', text: 'Welcome to AI Studio! Describe the project you want to build.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [conversation, isLoading]);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading) {
        setLoadingMessage(loadingMessages[0]);
        intervalId = window.setInterval(() => {
            setLoadingMessage(prev => {
                const currentIndex = loadingMessages.indexOf(prev);
                const nextIndex = (currentIndex + 1) % loadingMessages.length;
                return loadingMessages[nextIndex];
            });
        }, 2000); // Change message every 2 seconds
    }
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [isLoading]);

  useEffect(() => {
    const htmlFile = files.find(f => f.fileName.toLowerCase() === 'index.html');
    if (!htmlFile) {
        const message = files.length > 0 && !isLoading && files[0].fileName !== 'welcome.md'
          ? 'No index.html file found to preview.' 
          : 'The live preview of your generated code will appear here.';
        setPreviewContent(`
            <body style="font-family: sans-serif; color: #555; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8f9fa;">
                <p style="text-align: center; max-width: 300px;">${message}</p>
            </body>
        `);
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
  }, [files, isLoading]);

  const activeFileContent = useMemo(() => {
    if (!activeTab) return '';
    return files.find(f => f.fileName === activeTab)?.code || '';
  }, [files, activeTab]);
  
  const hasPreview = useMemo(() => files.some(f => f.fileName.toLowerCase() === 'index.html'), [files]);

  const handleSubmitPrompt = async () => {
    if (!prompt) return;

    const userMessage: ConversationMessage = { role: 'user', text: prompt, key: Date.now() };
    setConversation(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    const updatedFiles = await generateOrModifyCode(prompt, files);
    
    const aiDoneMessage: ConversationMessage = { role: 'ai', text: 'All set! The file explorer has been updated with your code.', key: Date.now() + 1 };
    setConversation(prev => [...prev, aiDoneMessage]);

    setFiles(updatedFiles);
    
    const updatedFileNames = new Set(updatedFiles.map(f => f.fileName));
    const newOpenTabs = openTabs.filter(tab => updatedFileNames.has(tab));
    
    let newActiveTab = activeTab;
    if (!activeTab || !updatedFileNames.has(activeTab)) {
        newActiveTab = updatedFiles.find(f => f.fileName.toLowerCase() === 'index.html')?.fileName || updatedFiles[0]?.fileName || null;
    }

    if (newActiveTab && !newOpenTabs.includes(newActiveTab)) {
        newOpenTabs.push(newActiveTab);
    }
    
    if (newOpenTabs.length === 0 && updatedFiles.length > 0) {
        const tabToOpen = updatedFiles[0].fileName;
        newOpenTabs.push(tabToOpen);
        newActiveTab = tabToOpen;
    }
    
    setOpenTabs(newOpenTabs);
    setActiveTab(newActiveTab);
    setIsLoading(false);
    setPrompt('');
  };

  const handleFileSelect = (fileName: string) => {
    if (!openTabs.includes(fileName)) {
        setOpenTabs(prev => [...prev, fileName]);
    }
    setActiveTab(fileName);
  };

  const handleTabClose = (fileNameToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const tabIndex = openTabs.indexOf(fileNameToClose);
    const newTabs = openTabs.filter(tab => tab !== fileNameToClose);
    setOpenTabs(newTabs);

    if (activeTab === fileNameToClose) {
        if (newTabs.length > 0) {
            const newActiveIndex = Math.max(0, tabIndex - 1);
            setActiveTab(newTabs[newActiveIndex]);
        } else {
            setActiveTab(null);
        }
    }
  };
  
   const handleDownload = async () => {
    if(files.length === 0 || files[0].fileName === 'welcome.md') return;
    const zip = new JSZip();
    files.forEach(file => {
        zip.file(file.fileName, file.code);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'ai-studio-project.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

 const handleOpenPreviewInNewTab = () => {
    if (!previewContent || !hasPreview) return;
    try {
      const blob = new Blob([previewContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to open preview in new tab:', error);
    }
  };
  
  const handleNewProject = () => {
    setFiles(initialFiles);
    setOpenTabs(['welcome.md']);
    setActiveTab('welcome.md');
    setConversation([
        { key: 0, role: 'ai', text: 'Welcome to AI Studio! Describe the project you want to build.' }
    ]);
  };

  return (
    <div className="flex h-full bg-[#1e1e1e] text-gray-300 font-mono">
      {/* Left Panel */}
      <div className="w-[350px] bg-[#252526] flex flex-col border-r border-gray-700 flex-shrink-0">
        <div className="h-[45%] flex flex-col p-2 border-b border-gray-700">
          <h3 className="text-xs uppercase font-bold text-gray-500 px-2 mb-2 flex-shrink-0">Conversation</h3>
            <div className="flex-grow overflow-y-auto space-y-4 p-2">
              {conversation.map((msg) => (
                <div key={msg.key} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                  {msg.role === 'ai' && <div className="w-6 h-6 text-xs rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">AI</div>}
                  <div 
                    onClick={() => msg.role === 'user' && setPrompt(msg.text)}
                    className={`p-2 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-gray-600 cursor-pointer' : 'bg-gray-700/60'}`}
                  >
                    {msg.text}
                  </div>
                  {msg.role === 'user' && <div className="w-6 h-6 text-xs rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">U</div>}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 text-xs rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">AI</div>
                  <div className="p-2 rounded-lg bg-gray-700/60 flex items-center">
                    <div className="flex items-center justify-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
        </div>
        
        <div className="flex-grow p-2 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between mb-2 px-2 flex-shrink-0">
                <h3 className="text-xs uppercase font-bold text-gray-500">Explorer</h3>
                <div className="flex items-center space-x-3">
                    <button onClick={handleNewProject} title="New Project" className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>
                    <button onClick={handleDownload} title="Download Project as ZIP" disabled={files.length === 0 || files[0].fileName === 'welcome.md'} className="text-gray-400 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                </div>
            </div>
            <ul className="flex-grow overflow-y-auto">
                {files.map(file => (
                <li 
                    key={file.fileName}
                    onClick={() => handleFileSelect(file.fileName)}
                    className={`flex items-center space-x-2 p-1 rounded-md cursor-pointer text-sm ${activeTab === file.fileName ? 'bg-gray-700/50' : 'hover:bg-gray-700/30'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    <span className="truncate">{file.fileName}</span>
                </li>
                ))}
                {isLoading && files.length === 0 && (
                    <div className="text-gray-400 text-sm p-2">Generating files...</div>
                )}
            </ul>
        </div>
        
        <div className="p-3 border-t border-gray-700 flex-shrink-0">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isLoading && handleSubmitPrompt())}
            placeholder="Describe the project you want to create or modify..."
            className="w-full p-2 h-24 bg-[#1e1e1e] border border-gray-600 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmitPrompt}
            disabled={isLoading || !prompt}
            className="w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center text-sm"
          >
            {isLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : 'Submit'}
          </button>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-grow flex flex-col relative">
         {isLoading && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center">
                <div className="w-48 h-48 relative mb-6">
                    <div className="absolute inset-0 border-4 border-indigo-500/50 rounded-full animate-pulse"></div>
                    <div className="absolute inset-4 border-4 border-indigo-500/50 rounded-full animate-pulse [animation-delay:-0.4s]"></div>
                    <div className="absolute inset-8 border-4 border-indigo-500/50 rounded-full animate-pulse [animation-delay:-0.8s]"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-indigo-400 font-mono text-5xl">
                        <span className="animate-pulse [animation-delay:-1s]">{'</>'}</span>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white">AI is building...</h3>
                <p className="text-gray-300 mt-2 transition-all duration-500 w-64 text-center">{loadingMessage}</p>
            </div>
         )}
         <div className="bg-[#252526] flex-shrink-0 flex border-b border-gray-700">
            {openTabs.map(tabName => (
                <div
                    key={tabName}
                    onClick={() => setActiveTab(tabName)}
                    className={`flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer border-r border-gray-700 ${activeTab === tabName ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] text-gray-400'}`}
                >
                    <span className="truncate max-w-xs">{tabName}</span>
                     <button onClick={(e) => handleTabClose(tabName, e)} className="ml-3 text-gray-500 hover:text-white rounded-full p-0.5 hover:bg-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            ))}
        </div>
        <div className="flex-grow grid grid-cols-2 overflow-hidden">
            <div className="relative overflow-hidden bg-[#1e1e1e]">
              {activeTab ? (
                  <pre className="w-full h-full p-4 overflow-auto text-sm absolute inset-0">
                    <code className="whitespace-pre-wrap">{activeFileContent}</code>
                  </pre>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                    {isLoading ? "Processing..." : "No file selected."}
                </div>
              )}
            </div>
            <div className="relative bg-white border-l border-gray-700 overflow-hidden">
                {hasPreview && (
                  <button
                    onClick={handleOpenPreviewInNewTab}
                    className="absolute top-2 right-2 p-1.5 bg-gray-100 text-gray-800 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors z-20"
                    title="Open preview in new tab"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                )}
                <iframe
                    srcDoc={previewContent}
                    title="Preview"
                    sandbox="allow-scripts allow-same-origin"
                    className="w-full h-full border-0"
                />
            </div>
        </div>
      </div>
    </div>
  );
};
