
// Fix: Add type declarations for browser-specific APIs (SpeechRecognition, webkitSpeechRecognition, webkitAudioContext)
// to resolve TypeScript errors.
interface SpeechRecognition {
  continuous: boolean;
  lang: string;
  interimResults: boolean;
  onstart: () => void;
  onend: () => void;
  onerror: (event: any) => void;
  onresult: (event: any) => void;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    webkitAudioContext: typeof AudioContext;
  }
}

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { generateOrModifyCode, generateText, generateSpeech, generatePortfolioFromResume, type CodeFile } from '../../services/geminiService';
import * as fileSystemService from '../../services/fileSystemService';
import JSZip from 'jszip';


const initialFiles: CodeFile[] = [
    {
        fileName: 'welcome.md',
        code: `# Welcome to the new Cherry AI!

Enter a prompt to the left to generate a complete project.
After that, you can enter more prompts to modify the code.

For example, try:
- "A simple HTML page with a counter button"
- Then, "Change the button color to blue"
- Or, upload your resume to generate a portfolio!`
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

// --- AUDIO UTILITY FUNCTIONS ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length;
  const buffer = ctx.createBuffer(1, frameCount, 24000);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

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


export const CherryAI: React.FC = () => {
  const [files, setFiles] = useState<CodeFile[]>(initialFiles);
  const [openTabs, setOpenTabs] = useState<string[]>(['welcome.md']);
  const [activeTab, setActiveTab] = useState<string | null>('welcome.md');
  const [prompt, setPrompt] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([
    { key: 0, role: 'ai', text: 'Welcome to Cherry AI! Describe the project you want to build or click the mic to speak.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [mobileTab, setMobileTab] = useState<'chat' | 'code'>('chat');

  // --- Voice State ---
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [voiceMode, setVoiceMode] = useState<'prompt' | 'confirmation'>('prompt');
  const [heldPrompt, setHeldPrompt] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceStateRef = useRef(voiceState);
  useEffect(() => { voiceStateRef.current = voiceState }, [voiceState]);


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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setVoiceState('listening');
      recognition.onend = () => {
        if (voiceStateRef.current === 'listening') setVoiceState('idle');
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
            setConversation(prev => [...prev, { key: Date.now(), role: 'ai' as const, text: "Sorry, I didn't catch that. Please try again." }]);
        } else {
            setConversation(prev => [...prev, { key: Date.now(), role: 'ai' as const, text: `A speech error occurred: ${event.error}.` }]);
        }
        setVoiceState('idle');
      };
      recognition.onresult = handleRecognitionResult;
      recognitionRef.current = recognition;
    }
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
     return () => recognitionRef.current?.stop();
  }, []); // Run only once on mount


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

  const executeCodeGeneration = async (promptToGenerate: string) => {
    setIsLoading(true);
    if (window.innerWidth < 1024) setMobileTab('code'); // Auto-switch to code view on mobile
    const updatedFiles = await generateOrModifyCode(promptToGenerate, files);

    if (updatedFiles.length > 0 && updatedFiles[0].fileName !== 'error.txt') {
        const aiDoneMessage: ConversationMessage = { role: 'ai', text: 'All set! The file explorer has been updated with your code.', key: Date.now() + 1 };
        setConversation(prev => [...prev, aiDoneMessage]);

        setFiles(updatedFiles);
        fileSystemService.saveCodeFiles(updatedFiles);
        
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
    } else {
        const errorMessage: ConversationMessage = { role: 'ai', text: `Sorry, I couldn't process that. The response was: ${updatedFiles[0]?.code || 'empty'}. Please try again.`, key: Date.now() + 1 };
        setConversation(prev => [...prev, errorMessage]);
    }
    setIsLoading(false);
  };

  const handleSubmitPrompt = async () => {
    if (!prompt) return;

    const userMessage: ConversationMessage = { role: 'user', text: prompt, key: Date.now() };
    setConversation(prev => [...prev, userMessage]);
    
    // Check if the prompt can be enhanced.
    const hasExistingCode = files && files.length > 0 && files[0].fileName !== 'welcome.md';
    if(hasExistingCode) {
        setIsEnhancing(true);
        const enhancementPrompt = `A user wants to modify a web project. Their request is: "${prompt}". Rephrase this into a clear, actionable, and detailed instruction for an expert web developer AI. The AI has the full context of all existing files. Focus on the desired outcome. For example, if the user says "make the button blue", you could say "In the CSS file, change the background color of the button class to a shade of blue, like #3498db."`;
        const enhancedPrompt = await generateText(enhancementPrompt);
        setIsEnhancing(false);
        setHeldPrompt(enhancedPrompt);
        setVoiceMode('confirmation');
        
        setConversation(prev => [...prev, { key: Date.now() + 1, role: 'ai' as const, text: `I've clarified your request to: "${enhancedPrompt}". Shall I proceed?` }]);

        const ttsPrompt = `I've clarified your request to: "${enhancedPrompt}". Should I go ahead and make those changes?`;
        speakText(ttsPrompt);

    } else {
        executeCodeGeneration(prompt);
    }
    setPrompt('');
  };

  const handleConfirmation = (confirm: boolean) => {
    if(confirm) {
        const proceedMessage: ConversationMessage = { role: 'user', text: "Yes, proceed.", key: Date.now() };
        setConversation(prev => [...prev, proceedMessage]);
        executeCodeGeneration(heldPrompt);
    } else {
        const cancelMessage: ConversationMessage = { role: 'user', text: "No, cancel.", key: Date.now() };
        const aiCancelMessage: ConversationMessage = { role: 'ai', text: "Okay, I've cancelled that request. What would you like to do instead?", key: Date.now()+1 };
        setConversation(prev => [...prev, cancelMessage, aiCancelMessage]);
        speakText("Okay, cancelled. What should I do instead?");
    }
    setVoiceMode('prompt');
    setHeldPrompt('');
  };

  const speakText = async (text: string) => {
    if (!text || !audioContextRef.current) return;
    setVoiceState('processing');
    try {
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        const base64Audio = await generateSpeech(text);
        const audioBytes = decode(base64Audio);
        const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => {
            setVoiceState('idle');
             if (voiceMode === 'confirmation') {
                recognitionRef.current?.start();
            }
        };
        source.start();
        setVoiceState('speaking');
    } catch (error) {
        console.error("Error speaking text:", error);
        setVoiceState('idle');
    }
  };

  const handleRecognitionResult = (event: any) => {
    const transcript = event.results[0][0].transcript.toLowerCase().trim();
    if(voiceMode === 'confirmation') {
        if(transcript.includes('yes') || transcript.includes('proceed') || transcript.includes('yep') || transcript.includes('okay')) {
            handleConfirmation(true);
        } else {
            handleConfirmation(false);
        }
    } else {
        setPrompt(transcript);
        const userMessage: ConversationMessage = { role: 'user', text: transcript, key: Date.now() };
        setConversation(prev => [...prev, userMessage]);
        handleSubmitPrompt(); // auto-submit after voice
    }
  };
  
  const handleMicClick = () => {
    if (!recognitionRef.current) return;
    recognitionRef.current.start();
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
    const blob = await zip.generateAsync({ type: 'blob' }) as Blob;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cherry-ai-project.zip';
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
        { key: 0, role: 'ai', text: 'Welcome to Cherry AI! Describe the project you want to build.' }
    ]);
  };

  const handleGenerateFromResumeClick = () => {
      resumeInputRef.current?.click();
  };

  const handleResumeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      setConversation(prev => [...prev, { key: Date.now(), role: 'ai' as const, text: 'Analyzing your resume to create a portfolio...' }]);
      
      try {
          const { base64, mimeType } = await fileToBase64(file);
          const generatedFiles = await generatePortfolioFromResume(base64, mimeType);

          if (generatedFiles.length > 0 && generatedFiles[0].fileName !== 'error.txt') {
              setFiles(generatedFiles);
              fileSystemService.saveCodeFiles(generatedFiles);
              
              const newTabs = generatedFiles.map(f => f.fileName);
              setOpenTabs(newTabs);
              setActiveTab(generatedFiles.find(f => f.fileName.toLowerCase() === 'index.html')?.fileName || newTabs[0]);
              
              setConversation(prev => [...prev, { key: Date.now() + 1, role: 'ai' as const, text: 'Success! Here is your new portfolio website. You can ask for changes in the chat.' }]);
              if(window.innerWidth < 1024) setMobileTab('code');
          } else {
              throw new Error(generatedFiles[0]?.code || 'Failed to generate files from resume.');
          }
      } catch (err) {
          console.error(err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setConversation(prev => [...prev, { key: Date.now() + 1, role: 'ai' as const, text: `Oh no, something went wrong. ${errorMessage}` }]);
      } finally {
          setIsLoading(false);
          // Reset file input value to allow re-uploading the same file
          if (e.target) e.target.value = '';
      }
  };


  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-gray-300 font-mono">
      <input type="file" ref={resumeInputRef} onChange={handleResumeFileChange} className="hidden" accept="image/*" />
      
      {/* Mobile Tab Bar */}
      <div className="lg:hidden flex border-b border-gray-700 bg-[#252526] sticky top-0 z-20">
         <button onClick={() => setMobileTab('chat')} className={`flex-1 p-3 text-sm font-semibold ${mobileTab === 'chat' ? 'text-white border-b-2 border-red-500 bg-[#333]' : 'text-gray-400'}`}>Chat</button>
         <button onClick={() => setMobileTab('code')} className={`flex-1 p-3 text-sm font-semibold ${mobileTab === 'code' ? 'text-white border-b-2 border-red-500 bg-[#333]' : 'text-gray-400'}`}>Code & Preview</button>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Left Panel (Chat) - Controlled by visibility on mobile */}
          <div className={`w-full lg:w-[350px] bg-[#252526] flex-col border-r border-gray-700 flex-shrink-0 h-full lg:flex ${mobileTab === 'chat' ? 'flex' : 'hidden'}`}>
            <div className="h-[45%] lg:h-[45%] flex flex-col p-2 border-b border-gray-700">
              <h3 className="text-xs uppercase font-bold text-gray-500 px-2 mb-2 flex-shrink-0">Conversation</h3>
                <div className="flex-grow overflow-y-auto space-y-4 p-2">
                  {conversation.map((msg) => (
                    <div key={msg.key} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                      {msg.role === 'ai' && <div className="w-6 h-6 text-xs rounded-full bg-red-500/80 flex items-center justify-center flex-shrink-0 font-sans font-bold">AI</div>}
                      <div 
                        onClick={() => msg.role === 'user' && setPrompt(msg.text)}
                        className={`p-2 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-gray-600 cursor-pointer' : 'bg-gray-700/60'}`}
                      >
                        {msg.text}
                         {isEnhancing && conversation[conversation.length - 1].key === msg.key &&
                            <div className="flex items-center text-xs mt-1 text-gray-400">
                                <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Enhancing prompt...
                            </div>
                         }
                      </div>
                      {msg.role === 'user' && <div className="w-6 h-6 text-xs rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0 font-sans font-bold">U</div>}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-6 h-6 text-xs rounded-full bg-red-500/80 flex items-center justify-center flex-shrink-0 font-sans font-bold">AI</div>
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
                    <div className="flex items-center space-x-2">
                        <button onClick={handleNewProject} title="New Project" className="text-gray-400 hover:text-white">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button onClick={handleGenerateFromResumeClick} title="Generate Portfolio from Resume" className="text-gray-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>
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
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), !isLoading && handleSubmitPrompt())}
                  placeholder="Describe the project you want to create or modify..."
                  className="w-full p-2 pr-10 h-24 bg-[#1e1e1e] border border-gray-600 rounded-md focus:ring-2 focus:ring-red-500 focus:outline-none text-sm resize-none"
                  disabled={isLoading || isEnhancing}
                />
                <button
                    onClick={handleMicClick}
                    disabled={isLoading || isEnhancing || voiceState !== 'idle'}
                    className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white disabled:text-gray-600"
                    title="Use Voice"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                     <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                     <path fillRule="evenodd" d="M3 8a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                     <path d="M10 18a5 5 0 005-5h-2a3 3 0 11-6 0H5a5 5 0 005 5z" />
                    </svg>
                </button>
              </div>
              <button
                onClick={handleSubmitPrompt}
                disabled={isLoading || !prompt || isEnhancing}
                className="w-full mt-2 px-4 py-2 bg-red-600/80 text-white rounded-md hover:bg-red-700/80 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center text-sm"
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

          {/* Right Panel (Code & Preview) - Controlled by visibility on mobile */}
          <div className={`flex-grow flex-col relative h-full lg:flex ${mobileTab === 'code' ? 'flex' : 'hidden'}`}>
             {(isLoading || isEnhancing) && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center">
                    <div className="w-48 h-48 relative mb-6">
                        <div className="absolute inset-0 border-4 border-red-500/50 rounded-full animate-pulse"></div>
                        <div className="absolute inset-4 border-4 border-red-500/50 rounded-full animate-pulse [animation-delay:-0.4s]"></div>
                        <div className="absolute inset-8 border-4 border-red-500/50 rounded-full animate-pulse [animation-delay:-0.8s]"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-red-400 font-mono text-5xl">
                            <span className="animate-pulse [animation-delay:-1s]">{'</>'}</span>
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white">AI is building...</h3>
                    <p className="text-gray-300 mt-2 transition-all duration-500 w-64 text-center">{isLoading ? loadingMessage : 'Enhancing prompt...'}</p>
                </div>
             )}
             <div className="bg-[#252526] flex-shrink-0 flex border-b border-gray-700 overflow-x-auto">
                {openTabs.map(tabName => (
                    <div
                        key={tabName}
                        onClick={() => setActiveTab(tabName)}
                        className={`flex items-center justify-between px-4 py-1.5 text-sm cursor-pointer border-r border-gray-700 flex-shrink-0 ${activeTab === tabName ? 'bg-[#1e1e1e]' : 'bg-[#2d2d2d] text-gray-400'}`}
                    >
                        <span className="truncate max-w-xs">{tabName}</span>
                         <button onClick={(e) => handleTabClose(tabName, e)} className="ml-3 text-gray-500 hover:text-white rounded-full p-0.5 hover:bg-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
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
                <div className="relative bg-white border-l border-gray-700 overflow-hidden hidden lg:block">
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
                {/* Mobile Preview Overlay/Tab content if we want to show just preview in a different way, but here it shares space with code. 
                    For simplicity on mobile, let's stack them or just show code. 
                    Let's stack them in the code tab for mobile.
                */}
                 <div className="relative bg-white border-t border-gray-700 overflow-hidden lg:hidden h-1/2">
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
                        title="Preview Mobile"
                        sandbox="allow-scripts allow-same-origin"
                        className="w-full h-full border-0"
                    />
                </div>
            </div>
          </div>
      </div>
    </div>
  );
};
