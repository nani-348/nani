

import React, { useState, useRef, useEffect } from 'react';
import { generateGroundedResponseStream, type Source } from '../../services/geminiService';

interface Message {
    id: number;
    role: 'user' | 'model';
    text: string;
    sources?: Source[];
}

type ChatHistory = { role: 'user' | 'model'; parts: { text: string }[] }[];

const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return (
        <div className="text-sm space-y-4">
            {parts.map((part, index) => {
                if (part.startsWith('```')) {
                    const code = part.replace(/```(\w*\n)?|```/g, '');
                    return (
                        <pre key={index} className="bg-gray-800 text-white p-3 rounded-md overflow-x-auto text-xs font-mono">
                            <code>{code}</code>
                        </pre>
                    );
                }
                
                const html = part
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">$1</code>')
                    .replace(/\n/g, '<br />');

                return <p key={index} dangerouslySetInnerHTML={{ __html: html }} />;
            })}
        </div>
    );
};

const LoadingIndicator = () => (
    <>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8,0,1,1); }
          50% { transform: none; animation-timing-function: cubic-bezier(0,0,0.2,1); }
        }
        .animate-bounce-custom { animation: bounce 1s infinite; }
      `}</style>
      <div className="flex items-center justify-center space-x-1.5 p-2">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-bounce-custom" style={{ animationDelay: '-0.3s' }}></div>
        <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce-custom" style={{ animationDelay: '-0.15s' }}></div>
        <div className="h-2 w-2 bg-yellow-500 rounded-full animate-bounce-custom"></div>
        <div className="h-2 w-2 bg-green-500 rounded-full animate-bounce-custom" style={{ animationDelay: '0.15s' }}></div>
      </div>
    </>
);


export const Google: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 1,
            role: 'model',
            text: "Hello! I'm powered by Google Search and Gemini. Ask me anything, and I'll find the most up-to-date information for you."
        }
    ]);
    const [history, setHistory] = useState<ChatHistory>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        
        const userMessageText = input.trim();
        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            text: userMessageText,
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const modelMessageId = Date.now() + 1;
        setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

        const newHistory: ChatHistory = [...history, { role: 'user', parts: [{ text: userMessageText }] }];
        let fullResponseText = "";
        let finalSources: Source[] = [];

        try {
            const stream = generateGroundedResponseStream(userMessageText, history);
            for await (const chunk of stream) {
                if (chunk.textChunk) {
                    fullResponseText += chunk.textChunk;
                    setMessages(prev => prev.map(msg => 
                        msg.id === modelMessageId ? { ...msg, text: fullResponseText } : msg
                    ));
                }
                if (chunk.sources) {
                    finalSources = chunk.sources;
                }
            }
        } catch (e) {
            fullResponseText = "Sorry, an error occurred while fetching the response.";
        }

        setMessages(prev => prev.map(msg => 
            msg.id === modelMessageId ? { ...msg, text: fullResponseText, sources: finalSources } : msg
        ));
        
        setHistory([...newHistory, { role: 'model', parts: [{ text: fullResponseText }] }]);
        setIsLoading(false);
    };
    
    return (
        <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <div className="flex-grow p-4 overflow-y-auto space-y-6">
                {messages.map(message => (
                    <div key={message.id} className={`flex items-end gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${message.role === 'user' ? 'bg-blue-500' : 'bg-gray-600'}`}>
                            {message.role === 'user' ? 'U' : 'G'}
                        </div>
                        <div className={`p-4 rounded-lg max-w-[80%] ${message.role === 'user' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-700'}`}>
                           {message.text === '' && message.role === 'model' ? (
                                <LoadingIndicator />
                           ) : message.role === 'user' ? (
                                <p className="text-sm">{message.text}</p>
                           ) : (
                                <MarkdownContent text={message.text} />
                           )}
                           {message.sources && message.sources.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                                    <h4 className="text-xs font-bold mb-2 text-gray-500 dark:text-gray-400">Sources:</h4>
                                    <ul className="space-y-1">
                                        {message.sources.map((source, i) => (
                                            <li key={i}>
                                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-xs" title={source.title}>
                                                    {i + 1}. {source.title}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask anything..."
                        className="flex-grow p-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-semibold"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};