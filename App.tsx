
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { LivePreview } from './components/LivePreview';
import { CodeViewer } from './components/CodeViewer';
import { generateCode, generatePortfolioFromData } from './services/geminiService';
import { GeneratedCode, ChatMessage, PortfolioData } from './types';
import { Code, BotMessageSquare, Eye, Send, LoaderCircle, User, Sparkles, ExternalLink, Download } from 'lucide-react';

const initialChatHistory: ChatMessage[] = [
    {
        role: 'assistant',
        content: "Hello! I can help you build a stunning personal portfolio. To get started, what is your full name?"
    }
];

type ConversationStep =
  | 'ASKING_NAME'
  | 'ASKING_TITLE'
  | 'ASKING_ABOUT'
  | 'ASKING_SKILLS' // Added new conversation step
  | 'ASKING_EDUCATION'
  | 'ASKING_EMAIL'
  | 'ASKING_LINKEDIN'
  | 'ASKING_GITHUB'
  | 'ASKING_PROJECT_TITLE'
  | 'ASKING_PROJECT_DESC'
  | 'ASKING_PROJECT_LINK'
  | 'ASKING_ANOTHER_PROJECT'
  | 'ASKING_CONTACT_FORM'
  | 'ASKING_THEME'
  | 'GENERATING'
  | 'MODIFYING';

const suggestionPool: string[] = [
    "Change the color scheme to a light theme",
    "Make the header sticky on scroll",
    "Add a subtle hover effect to the project cards",
    "Change the main font to 'Georgia'",
    "Add a new 'Skills' section",
    "Animate the title in the hero section",
    "Make the project images pop out on hover",
    "Add social media icons to the contact section",
    "Increase the overall font size for better readability",
    "Add a background image to the hero section",
    "Implement a dark/light mode toggle",
    "Rewrite the 'About Me' section to sound more professional",
    "Add another project to the list",
];

const getRandomSuggestions = (count: number): string[] => {
    const shuffled = [...suggestionPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};


const App: React.FC = () => {
    const [code, setCode] = useState<GeneratedCode | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>(initialChatHistory);
    const [prompt, setPrompt] = useState('');
    const [conversationStep, setConversationStep] = useState<ConversationStep>('ASKING_NAME');
    const [portfolioData, setPortfolioData] = useState<PortfolioData>({ projects: [] });

    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory]);

    const handleInitialGeneration = useCallback(async (finalData: PortfolioData) => {
        setIsLoading(true);
        setError(null);
        setChatHistory(prev => [...prev, { role: 'assistant', content: "Perfect, I have all the information I need. I will now generate your personalized portfolio. This might take a moment." }]);

        try {
            const newCode = await generatePortfolioFromData(finalData);
            setCode(newCode);
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: "Your portfolio is ready! You can see it in the live preview. Feel free to ask for any changes or refinements.",
                suggestions: getRandomSuggestions(3)
            }]);
            setConversationStep('MODIFYING');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
            setError(errorMessage);
            setChatHistory(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}. Please try again.` }]);
            setConversationStep('ASKING_THEME'); // Re-ask the last question before generation
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handlePromptSubmit = useCallback(async () => {
        if (!prompt.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: prompt };
        setChatHistory(prev => [...prev, userMessage]);
        const currentPrompt = prompt;
        setPrompt('');

        if (conversationStep === 'MODIFYING') {
            setIsLoading(true);
            setError(null);
            try {
                const currentCode = code ? code : undefined;
                const newCode = await generateCode(currentPrompt, currentCode);
                setCode(newCode);
                setChatHistory(prev => [...prev, { role: 'assistant', content: "Here's the updated code. What would you like to do next?", suggestions: getRandomSuggestions(2) }]);
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
                setError(errorMessage);
                setChatHistory(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}` }]);
            } finally {
                setIsLoading(false);
            }
        } else {
            let nextStep: ConversationStep = conversationStep;
            let newData: PortfolioData = { ...portfolioData, projects: [...portfolioData.projects] };
            let nextQuestion = '';

            switch (conversationStep) {
                case 'ASKING_NAME':
                    newData.name = currentPrompt;
                    nextStep = 'ASKING_TITLE';
                    nextQuestion = `Great, ${currentPrompt.split(' ')[0]}! What's your professional title? (e.g., AI Prompt Engineer)`;
                    break;
                case 'ASKING_TITLE':
                    newData.title = currentPrompt;
                    nextStep = 'ASKING_ABOUT';
                    nextQuestion = "Perfect. Now, write a short paragraph for your 'About Me' section.";
                    break;
                case 'ASKING_ABOUT':
                    newData.about = currentPrompt;
                    nextStep = 'ASKING_SKILLS'; // Transition to asking for skills
                    nextQuestion = "Excellent! What are your key technical skills? Please list them, separated by commas (e.g., JavaScript, React, Node.js).";
                    break;
                case 'ASKING_SKILLS': // New case for skills
                    newData.skills = currentPrompt;
                    nextStep = 'ASKING_EDUCATION';
                    nextQuestion = "Got it. What's your highest level of education? (e.g., B.Tech in ECE, Fictional University)";
                    break;
                case 'ASKING_EDUCATION':
                    newData.education = currentPrompt;
                    nextStep = 'ASKING_EMAIL';
                    nextQuestion = "Thanks. Now, what's your contact email address?";
                    break;
                case 'ASKING_EMAIL':
                    newData.email = currentPrompt;
                    nextStep = 'ASKING_LINKEDIN';
                    nextQuestion = "Got it. What's the full URL to your LinkedIn profile?";
                    break;
                case 'ASKING_LINKEDIN':
                    newData.linkedin = currentPrompt;
                    nextStep = 'ASKING_GITHUB';
                    nextQuestion = "And your GitHub profile URL?";
                    break;
                case 'ASKING_GITHUB':
                    newData.github = currentPrompt;
                    nextStep = 'ASKING_PROJECT_TITLE';
                    nextQuestion = "Let's add your first project. What is its title?";
                    break;
                case 'ASKING_PROJECT_TITLE':
                    newData.projects.push({ title: currentPrompt, description: '', link: '' });
                    nextStep = 'ASKING_PROJECT_DESC';
                    nextQuestion = `What's a brief description for "${currentPrompt}"?`;
                    break;
                case 'ASKING_PROJECT_DESC':
                    newData.projects[newData.projects.length - 1].description = currentPrompt;
                    nextStep = 'ASKING_PROJECT_LINK';
                    nextQuestion = "And finally, a link for this project (e.g., GitHub or live site).";
                    break;
                case 'ASKING_PROJECT_LINK':
                    newData.projects[newData.projects.length - 1].link = currentPrompt;
                    nextStep = 'ASKING_ANOTHER_PROJECT';
                    nextQuestion = "Project added! Would you like to add another project? (yes/no)";
                    break;
                case 'ASKING_ANOTHER_PROJECT':
                    if (['yes', 'y', 'yep', 'sure'].includes(currentPrompt.toLowerCase())) {
                        nextStep = 'ASKING_PROJECT_TITLE';
                        nextQuestion = "Great! What's the title of the next project?";
                    } else {
                        nextStep = 'ASKING_CONTACT_FORM';
                        nextQuestion = "Okay, no more projects. Would you like to include a contact form in your portfolio? (yes/no)";
                    }
                    break;
                case 'ASKING_CONTACT_FORM':
                    newData.includeContactForm = ['yes', 'y', 'yep', 'sure'].includes(currentPrompt.toLowerCase());
                    nextStep = 'ASKING_THEME';
                    nextQuestion = "Got it. What kind of style or theme are you going for? (e.g., minimalist, dark mode, futuristic, professional)";
                    break;
                case 'ASKING_THEME':
                    newData.theme = currentPrompt;
                    nextStep = 'GENERATING';
                    break;
            }
            
            setPortfolioData(newData);
            setConversationStep(nextStep);

            if (nextStep === 'GENERATING') {
                handleInitialGeneration(newData);
            } else {
                setChatHistory(prev => [...prev, { role: 'assistant', content: nextQuestion }]);
            }
        }
    }, [prompt, isLoading, chatHistory, code, conversationStep, portfolioData, handleInitialGeneration]);

    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(suggestion);
        // Focus the textarea after setting the prompt
        const textarea = document.querySelector('textarea');
        if (textarea) {
            textarea.focus();
        }
    };

    const handleDownload = useCallback(async () => {
        if (!code) return;
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();

        const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolioData.name || 'Generated'} Portfolio</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    ${code.html}
    <script src="script.js"></script>
</body>
</html>`;

        zip.file("index.html", fullHtml);
        zip.file("style.css", code.css);
        zip.file("script.js", code.js);

        zip.generateAsync({ type: "blob" }).then(function (content) {
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(portfolioData.name || 'portfolio').toLowerCase().replace(/\s+/g, '-')}-project.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }, [code, portfolioData]);

    const handleOpenInNewTab = useCallback(() => {
        if (!code) return;

        const documentContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${portfolioData.name || 'Generated'} Preview</title>
                <style>${code.css}</style>
            </head>
            <body>
                ${code.html}
                <script>${code.js}</script>
            </body>
            </html>
        `;

        const blob = new Blob([documentContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
            // Try to revoke the URL after the new tab has loaded.
            newWindow.onload = () => {
                URL.revokeObjectURL(url);
            };
        }
    }, [code, portfolioData]);


    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <aside className="w-[480px] flex flex-col bg-gray-800 p-4 border-r border-gray-700">
                <header className="flex items-center gap-3 pb-4 border-b border-gray-700 mb-4 flex-shrink-0">
                    <BotMessageSquare className="w-8 h-8 text-cyan-500" />
                    <div>
                        <h1 className="text-xl font-bold">Shakthi Portfolio Builder</h1>
                        <p className="text-sm text-gray-400">Create a portfolio via chat</p>
                    </div>
                </header>
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {chatHistory.map((msg, index) => (
                        <div key={index}>
                            <div className={`flex gap-3 text-sm ${msg.role === 'user' ? 'justify-end' : 'items-start'}`}>
                                {msg.role !== 'user' && <BotMessageSquare className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-1" />}
                                <div className={`rounded-lg p-3 max-w-md ${
                                    msg.role === 'user' ? 'bg-cyan-600' :
                                        msg.role === 'assistant' ? 'bg-gray-700' :
                                            'bg-red-900/50 border border-red-500/50 text-red-300'
                                    }`}>
                                    {msg.content}
                                </div>
                                {msg.role === 'user' && <User className="w-5 h-5 bg-gray-700 p-1 rounded-full flex-shrink-0 mt-1" />}
                            </div>
                            {msg.role === 'assistant' && msg.suggestions && (
                                <div className="flex flex-wrap gap-2 mt-2 ml-8">
                                    {msg.suggestions.map((s, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSuggestionClick(s)}
                                            className="px-3 py-1 bg-gray-600/50 text-cyan-400 text-xs rounded-full hover:bg-gray-600 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3">
                            <BotMessageSquare className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-1" />
                            <div className="bg-gray-700 rounded-lg p-3 max-w-md flex items-center gap-2">
                                <LoaderCircle className="w-4 h-4 animate-spin" />
                                <span>{conversationStep === 'GENERATING' ? 'Building portfolio...' : 'Updating...'}</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700 flex-shrink-0">
                    <form onSubmit={(e) => { e.preventDefault(); handlePromptSubmit(); }} className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePromptSubmit(); } }}
                            placeholder={isLoading ? "Please wait..." : "Type your response..."}
                            className="w-full h-24 p-3 pr-12 bg-gray-700 border border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-shadow"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !prompt}
                            className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 bg-cyan-600 text-white rounded-full hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                            aria-label="Send prompt"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            </aside>

            <main className="flex-1 flex flex-col">
                {code ? (
                    <div className="flex flex-col flex-1 min-h-0">
                        <header className="flex items-center justify-between p-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                            <div className="flex space-x-1">
                                <button onClick={() => setActiveTab('preview')} className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'preview' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Live Preview
                                </button>
                                <button onClick={() => setActiveTab('code')} className={`flex items-center px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'code' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>
                                    <Code className="w-4 h-4 mr-2" />
                                    Code
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={handleOpenInNewTab}
                                    className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-300 bg-gray-700 hover:bg-gray-600"
                                    title="Open preview in a new tab"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Open
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-cyan-600 text-white hover:bg-cyan-500"
                                    title="Download project as a ZIP file"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download ZIP
                                </button>
                            </div>
                        </header>
                        <div className="flex-1 relative bg-gray-900">
                            <div className={`${activeTab === 'preview' ? 'block' : 'hidden'} w-full h-full`}>
                                <LivePreview code={code} isLoading={isLoading} />
                            </div>
                            <div className={`${activeTab === 'code' ? 'block' : 'hidden'} w-full h-full`}>
                                <CodeViewer code={code} isLoading={isLoading} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500">
                        <div className="text-center p-8">
                            <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                            <h2 className="text-xl font-semibold">Your Portfolio Preview Will Appear Here</h2>
                            <p>Follow the instructions in the chat to build your site.</p>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
