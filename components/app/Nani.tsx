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

import React, { useState, useRef, useEffect } from 'react';
import { generateGroundedResponseStream, generateSpeech, type Source } from '../../services/geminiService';

// --- CONSTANTS ---
const NANI_SYSTEM_INSTRUCTION = "Your name is Nani. You are a friendly, funny, and helpful AI assistant integrated into a virtual macOS. Keep your answers concise and friendly.";

// --- TYPE DEFINITIONS ---
interface Message {
    id: number;
    role: 'user' | 'model';
    text: string;
    sources?: Source[];
}
type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];
type Mode = 'chat' | 'voice';
type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';


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
  const buffer = ctx.createBuffer(1, frameCount, 24000); // 1 channel, 24kHz sample rate for TTS
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < frameCount; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}


// --- UI SUB-COMPONENTS ---
const MarkdownContent: React.FC<{ text: string }> = React.memo(({ text }) => {
    // Basic markdown to HTML conversion
    const html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">$1</code>')
        .replace(/\n/g, '<br />');
    return <div className="text-sm space-y-4" dangerouslySetInnerHTML={{ __html: html }} />;
});

const LoadingIndicator: React.FC = () => (
    <div className="flex items-center justify-center space-x-1.5 p-2">
      {[...Array(4)].map((_, i) => <div key={i} className={`h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse`} style={{ animationDelay: `${i * 100}ms` }} />)}
    </div>
);


// --- MAIN NANI COMPONENT ---
export const Nani: React.FC = () => {
    const [mode, setMode] = useState<Mode>('chat');
    
    // Chat state
    const [messages, setMessages] = useState<Message[]>([
        { id: 1, role: 'model', text: "Hello! I'm Nani. Ask me anything, and I'll find the most up-to-date information for you." }
    ]);
    const [history, setHistory] = useState<ChatHistory>([]);
    const [input, setInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Voice state
    const [voiceState, setVoiceState] = useState<VoiceState>('idle');
    const [voiceMessages, setVoiceMessages] = useState<Message[]>([
        { id: 1, role: 'model', text: "Hello! I'm Nani. When you're ready, click the orb and speak." }
    ]);
    const [voiceHistory, setVoiceHistory] = useState<ChatHistory>([]);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentlySpeakingMessageId, setCurrentlySpeakingMessageId] = useState<number | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const voiceStateRef = useRef<VoiceState>('idle');
    
    // Refs for streaming audio
    const audioQueueRef = useRef<AudioBuffer[]>([]);
    const isAudioPlayingRef = useRef<boolean>(false);
    
    // --- EFFECTS ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, voiceMessages]);

    useEffect(() => {
        voiceStateRef.current = voiceState;
    }, [voiceState]);
    
    // This effect should run only once to initialize the recognition service.
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onstart = () => setVoiceState('listening');
            
            recognition.onend = () => {
                if (voiceStateRef.current === 'listening') {
                    setVoiceState('idle'); // Ended without result
                }
            };
            
            recognition.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'no-speech') {
                    setVoiceMessages(prev => [...prev, { id: Date.now(), role: 'model', text: "I didn't hear you. Please click the orb and try again." }]);
                    setVoiceState('idle');
                } else {
                    setVoiceMessages(prev => [...prev, { id: Date.now(), role: 'model', text: `An error occurred: ${event.error}. Please try again.` }]);
                    setVoiceState('error');
                }
            };
            
            recognition.onresult = handleRecognitionResult;
            recognitionRef.current = recognition;
        }

        // Initialize AudioContext
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        }
        
        return () => {
            recognitionRef.current?.stop();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once

    // --- CHAT FUNCTIONS ---
    const handleSend = async () => {
        if (!input.trim() || isChatLoading) return;
        const userMessageText = input.trim();
        setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: userMessageText }]);
        setInput('');
        setIsChatLoading(true);

        const modelMessageId = Date.now() + 1;
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

        const newHistory: ChatHistory = [...history, { role: 'user', parts: [{ text: userMessageText }] }];
        let fullResponseText = "";
        let finalSources: Source[] = [];

        try {
            for await (const chunk of generateGroundedResponseStream(userMessageText, history, NANI_SYSTEM_INSTRUCTION)) {
                if (chunk.textChunk) {
                    fullResponseText += chunk.textChunk;
                }
                if (chunk.sources) {
                    finalSources = chunk.sources;
                }
                setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: fullResponseText, sources: finalSources } : msg));
            }
        } catch (e) {
            fullResponseText = "Sorry, an error occurred while fetching the response.";
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, text: fullResponseText } : msg));
        }
        
        setHistory([...newHistory, { role: 'model', parts: [{ text: fullResponseText }] }]);
        setIsChatLoading(false);
    };

    // --- STREAMING VOICE FUNCTIONS ---

    const playFromAudioQueue = async () => {
        if (isAudioPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
            return;
        }

        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        isAudioPlayingRef.current = true;
        setVoiceState('speaking');
        
        const audioBuffer = audioQueueRef.current.shift();
        if (!audioBuffer) {
            isAudioPlayingRef.current = false;
            setVoiceState('idle'); 
            return;
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = playbackRate;
        source.connect(audioContextRef.current.destination);
        audioSourceRef.current = source; 

        source.onended = () => {
            isAudioPlayingRef.current = false;
            audioSourceRef.current = null;
            if (audioQueueRef.current.length === 0) {
                setCurrentlySpeakingMessageId(null);
                // After speaking, go back to idle instead of auto-listening.
                // This prevents the "no-speech" error if the user isn't ready.
                setVoiceState('idle');
            } else {
                playFromAudioQueue();
            }
        };
        
        source.start(0);
    };

    const generateAndQueueAudio = async (text: string) => {
        if (!text.trim() || !audioContextRef.current) return;
        try {
            const base64Audio = await generateSpeech(text);
            const audioBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current);
            audioQueueRef.current.push(audioBuffer);
            playFromAudioQueue();
        } catch (error) {
            console.error('Error generating or queueing audio chunk:', error);
        }
    };

    const handleRecognitionResult = async (event: any) => {
        setVoiceState('processing');
        const transcript = event.results[0][0].transcript;
        const userMessage: Message = { id: Date.now(), role: 'user', text: transcript };
        setVoiceMessages(prev => [...prev, userMessage]);

        const modelMessageId = Date.now() + 1;
        setVoiceMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);
        setCurrentlySpeakingMessageId(modelMessageId);
        
        const newVoiceHistory: ChatHistory = [...voiceHistory, { role: 'user', parts: [{ text: transcript }] }];
        let fullResponseText = "";
        let sentenceBuffer = "";

        try {
            const stream = generateGroundedResponseStream(transcript, voiceHistory, NANI_SYSTEM_INSTRUCTION);
            for await (const chunk of stream) {
                if (chunk.textChunk) {
                    fullResponseText += chunk.textChunk;
                    sentenceBuffer += chunk.textChunk;
                    
                    setVoiceMessages(prev => prev.map(msg => 
                        msg.id === modelMessageId ? { ...msg, text: fullResponseText, sources: chunk.sources || msg.sources } : msg
                    ));

                    const sentenceEndings = /[.?!]/;
                    while (sentenceEndings.test(sentenceBuffer)) {
                        const match = sentenceBuffer.match(sentenceEndings);
                        if (match && typeof match.index === 'number') {
                            const sentence = sentenceBuffer.substring(0, match.index + 1);
                            sentenceBuffer = sentenceBuffer.substring(match.index + 1);
                            generateAndQueueAudio(sentence);
                        } else {
                            break; 
                        }
                    }
                }
            }
            if (sentenceBuffer.trim()) {
                generateAndQueueAudio(sentenceBuffer);
            }
            setVoiceHistory([...newVoiceHistory, { role: 'model', parts: [{ text: fullResponseText }] }]);
        } catch (e) {
            console.error('Error processing voice query:', e);
            const errorText = "I encountered an issue. Please try again.";
            setVoiceMessages(prev => prev.map(msg => 
                msg.id === modelMessageId ? { ...msg, text: errorText } : msg
            ));
            setVoiceState('error');
        }
    };
    
    const handleVoiceToggle = () => {
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (!recognitionRef.current) {
            setVoiceState('error');
            setVoiceMessages(prev => [...prev, { id: Date.now(), role: 'model', text: "Speech recognition is not supported in your browser." }]);
            return;
        }

        switch (voiceState) {
            case 'listening':
                recognitionRef.current.stop();
                setVoiceState('idle');
                break;
            case 'speaking':
                audioSourceRef.current?.stop();
                audioSourceRef.current = null;
                audioQueueRef.current = []; // Clear upcoming audio
                setCurrentlySpeakingMessageId(null);
                setVoiceState('idle');
                break;
            case 'idle':
            case 'error':
                recognitionRef.current.start();
                break;
        }
    };

    // --- RENDER LOGIC ---
    const renderChatMode = () => (
        <>
            <div className="flex-grow p-4 overflow-y-auto space-y-6">
                {messages.map(message => (
                    <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${message.role === 'user' ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                            {message.role === 'user' ? 'U' : 'N'}
                        </div>
                        <div className={`p-3 rounded-lg max-w-[80%] shadow-sm ${message.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
                           {message.text === '' && message.role === 'model' ? <LoadingIndicator /> : <MarkdownContent text={message.text} />}
                           {/* Sources rendering can be added here if needed */}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center space-x-2">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Type your message..." className="flex-grow p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isChatLoading} />
                    <button onClick={handleSend} disabled={isChatLoading || !input.trim()} className="w-12 h-12 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                    </button>
                </div>
            </div>
        </>
    );

    const renderVoiceMode = () => {
        let statusText = "Click the orb to start speaking";
        let coreClass = "nani-core-idle";
        let ring1Class = "nani-ring1-idle";
        let ring2Class = "nani-ring2-idle";
        let containerClass = "";

        switch(voiceState) {
            case 'listening':
                statusText = "Listening...";
                coreClass = "nani-core-listening"; ring1Class = "nani-ring1-listening"; ring2Class = "nani-ring2-listening";
                break;
            case 'processing':
                statusText = "Thinking...";
                coreClass = "nani-core-processing"; ring1Class = "nani-ring1-processing"; ring2Class = "nani-ring2-processing";
                break;
            case 'speaking':
                statusText = "Speaking... (Click to interrupt)";
                coreClass = "nani-core-speaking"; ring1Class = "nani-ring1-speaking"; ring2Class = "nani-ring2-speaking";
                break;
            case 'error':
                 statusText = "Uh oh, something went wrong.";
                 containerClass = "nani-all-error";
                 break;
            case 'idle':
            default:
                break;
        }

        return (
            <div className="flex-grow flex flex-col items-center justify-between p-4 text-center overflow-hidden">
                <div className="w-full max-w-2xl h-full overflow-y-auto mb-4 space-y-6 pr-2">
                    {voiceMessages.map(message => (
                        <div key={message.id} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {message.role === 'model' && 
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 bg-purple-500">N</div>
                            }
                            <div className={`p-3 rounded-lg max-w-[85%] shadow-sm text-left ${message.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-700'} ${message.id === currentlySpeakingMessageId ? 'animate-speaking-glow' : ''}`}>
                               {message.text === '' && message.role === 'model' ? <LoadingIndicator /> : <MarkdownContent text={message.text} />}
                            </div>
                             {message.role === 'user' && 
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 bg-indigo-500">U</div>
                            }
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    <div 
                        className={`relative w-32 h-32 sm:w-40 sm:h-40 cursor-pointer ${containerClass}`}
                        onClick={handleVoiceToggle}
                    >
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <defs>
                                <radialGradient id="nani-orb-core-grad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#a78bfa" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                </radialGradient>
                                 <radialGradient id="nani-orb-ring-grad" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#6366f1" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </radialGradient>
                            </defs>
                            <circle cx="50" cy="50" r="45" fill="url(#nani-orb-ring-grad)" opacity="0.2" className={ring2Class} />
                            <circle cx="50" cy="50" r="35" fill="url(#nani-orb-ring-grad)" opacity="0.4" className={ring1Class} />
                            <circle cx="50" cy="50" r="25" fill="url(#nani-orb-core-grad)" className={coreClass} />
                        </svg>
                    </div>

                    <div className="h-10 mt-2 flex flex-col justify-center items-center">
                        <p className="text-md font-medium text-gray-500 dark:text-gray-400">{statusText}</p>
                    </div>
                     <div className="flex items-center justify-center space-x-2 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Speed:</span>
                        {[0.75, 1, 1.5, 2].map(rate => (
                            <button key={rate} onClick={() => setPlaybackRate(rate)} className={`px-2 py-0.5 text-xs rounded-full transition-colors ${playbackRate === rate ? 'bg-purple-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <header className="flex-shrink-0 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-center">
                 <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center space-x-1">
                    <button 
                        onClick={() => setMode('chat')}
                        className={`px-4 py-1 text-sm font-semibold rounded-md ${mode === 'chat' ? 'bg-white dark:bg-gray-600 shadow-sm text-indigo-600 dark:text-indigo-300' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Chat
                    </button>
                    <button 
                        onClick={() => setMode('voice')}
                        className={`px-4 py-1 text-sm font-semibold rounded-md ${mode === 'voice' ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-600 dark:text-purple-300' : 'text-gray-600 dark:text-gray-300'}`}
                    >
                        Voice
                    </button>
                </div>
            </header>
            
            {mode === 'chat' ? renderChatMode() : renderVoiceMode()}
            
        </div>
    );
};