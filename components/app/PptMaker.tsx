
import React, { useState, useEffect } from 'react';
import { generatePresentation, editSlide, type Slide } from '../../services/geminiService';
import PptxGenJS from 'pptxgenjs';

const getAnimationClass = (transition?: Slide['transition']) => {
    switch (transition) {
        case 'fade': return 'animate-fade-in';
        case 'slide': return 'animate-slide-in-right';
        case 'zoom': return 'animate-zoom-in';
        default: return '';
    }
};

const loadingMessages = [
    "Drafting slide outlines...",
    "Generating key talking points...",
    "Designing visuals for each slide...",
    "Applying a professional theme...",
    "Gathering illustrative images...",
    "This can take a moment, especially for images...",
    "Finalizing your presentation..."
];


export const PptMaker: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>([
    { title: 'Welcome to PowerPoint', content: ['Use the AI generator to create a new presentation.'], transition: 'none' }
  ]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [generationTopic, setGenerationTopic] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [showMobileTools, setShowMobileTools] = useState(true); // State for mobile toggle

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
        }, 2500);
    }
    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
  }, [isLoading]);


  const handleGenerateSlides = async () => {
    if (!prompt) return;
    setIsLoading(true);
    if (window.innerWidth < 768) setShowMobileTools(false); // Auto-hide tools on mobile start
    setSlides([]);
    setCurrentSlide(0);
    setGenerationTopic(prompt);
    const generatedSlidesRaw = await generatePresentation(prompt, slideCount);
    const generatedSlides = generatedSlidesRaw.map(slide => ({
      ...slide,
      transition: 'fade' as const, // Add default transition
    }));
    
    if (generatedSlides && generatedSlides.length > 0 && generatedSlides[0].title !== 'Error') {
      setSlides(generatedSlides);
      setCurrentSlide(0);
    } else {
      setSlides([{ title: 'Generation Failed', content: ['An error occurred. Please check the console and try again.'], transition: 'none' }]);
      setCurrentSlide(0);
    }

    setIsLoading(false);
    setPrompt('');
  };

  const handleReviseSlide = async () => {
    if (!editPrompt || currentSlide < 0 || slides[currentSlide].title === 'Welcome to PowerPoint') return;

    setIsEditing(true);
    const slideToEdit = slides[currentSlide];

    try {
        const revisedSlideData = await editSlide(slideToEdit, generationTopic, editPrompt);
        const revisedSlide = {
            ...revisedSlideData,
            transition: slideToEdit.transition || 'none', // Preserve existing transition
        };
        const newSlides = [...slides];
        newSlides[currentSlide] = revisedSlide;
        setSlides(newSlides);
        setEditPrompt('');
    } catch (error) {
        console.error("Failed to revise slide:", error);
        // You might want to show a user-facing error message here
    } finally {
        setIsEditing(false);
    }
  };

  const handleTransitionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTransition = e.target.value as Slide['transition'];
    const newSlides = [...slides];
    if (newSlides[currentSlide]) {
        newSlides[currentSlide].transition = newTransition;
        setSlides(newSlides);
    }
  };

  const handleDownload = async () => {
     if (slides.length === 0 || slides[0].title === 'Welcome to PowerPoint') return;
     const pptx = new PptxGenJS();
     // Explicitly set 16x9 layout (10 inches x 5.625 inches)
     pptx.layout = 'LAYOUT_16x9'; 
    
     slides.forEach((slideData, index) => {
        const slide = pptx.addSlide();
        
        // --- LAYOUT CONSTANTS (Inches) ---
        // Slide is 10 x 5.625
        const margin = 0.5;
        const titleY = 0.4;
        const titleH = 0.8;
        const bodyY = 1.4;
        const bodyH = 3.8;
        const fullWidth = 9.0; // 10 - 0.5 - 0.5
        
        // Add Title - Centered at the top
        slide.addText(slideData.title, { 
            x: margin, 
            y: titleY, 
            w: fullWidth, 
            h: titleH, 
            fontSize: 24, 
            bold: true, 
            align: 'center', 
            valign: 'middle',
            color: '363636',
            fontFace: 'Arial'
        });
        
        const hasImage = !!slideData.imageBase64;

        if (hasImage) {
            // Two Column Layout
            const isTextLeft = index % 2 === 0;
            const gutter = 0.4;
            const colWidth = (fullWidth - gutter) / 2; // (9 - 0.4) / 2 = 4.3
            
            const leftX = margin;
            const rightX = margin + colWidth + gutter; // 0.5 + 4.3 + 0.4 = 5.2

            const textX = isTextLeft ? leftX : rightX;
            const imgX = isTextLeft ? rightX : leftX;

            // Add Text Column
            slide.addText(slideData.content.map(p => ({ text: p, options: { breakLine: true } })), {
                x: textX,
                y: bodyY,
                w: colWidth,
                h: bodyH,
                fontSize: 14,
                bullet: true,
                color: '4f4f4f',
                valign: 'top',
                align: 'left',
                fontFace: 'Arial',
                shrinkText: true // Critical for preventing overflow
            });
            
            // Add Image Column
            slide.addImage({
                data: `data:image/png;base64,${slideData.imageBase64}`,
                x: imgX,
                y: bodyY,
                w: colWidth,
                h: bodyH,
                sizing: { type: 'contain', w: colWidth, h: bodyH }
            });
        } else {
            // Single Column (Full Width) Layout
            // We center a slightly narrower text box for readability
            const textWidth = 8.0; 
            const textX = (10 - textWidth) / 2;

            slide.addText(slideData.content.map(p => ({ text: p, options: { breakLine: true } })), {
                x: textX,
                y: bodyY,
                w: textWidth,
                h: bodyH,
                fontSize: 16, // Slightly larger font for full width
                bullet: true,
                color: '4f4f4f',
                valign: 'top',
                align: 'left',
                fontFace: 'Arial',
                shrinkText: true
            });
        }
    });
    
    pptx.writeFile({ fileName: `${generationTopic.replace(/ /g, '_') || 'presentation'}.pptx` });
  };

  const activeSlide = slides[currentSlide];
  const isActionable = slides.length > 0 && slides[0].title !== 'Welcome to PowerPoint';

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 relative">
      
      {/* Mobile Tool Toggle */}
      <button 
        onClick={() => setShowMobileTools(!showMobileTools)}
        className="md:hidden absolute top-2 right-2 z-30 bg-gray-800 text-white p-2 rounded-full shadow-lg opacity-80 hover:opacity-100"
      >
        {showMobileTools ? (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
           </svg>
        ) : (
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
             <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
           </svg>
        )}
      </button>

      {/* Left Sidebar (Tools) */}
      <aside className={`${showMobileTools ? 'flex' : 'hidden'} md:flex w-full md:w-96 flex-col flex-shrink-0 bg-gray-100 dark:bg-gray-900/95 border-r border-gray-200 dark:border-gray-700 absolute md:static inset-0 z-20 md:z-auto`}>
        
        {/* Generation Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          <h2 className="text-lg font-semibold">New Presentation</h2>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a presentation topic..."
            className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-orange-500 focus:outline-none"
            disabled={isLoading || isEditing}
          />
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2 text-sm">
              <span>Slides:</span>
              <input
                type="number"
                value={slideCount}
                onChange={(e) => setSlideCount(Math.max(1, parseInt(e.target.value, 10)))}
                min="1"
                max="15"
                className="w-16 p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md"
                disabled={isLoading || isEditing}
              />
            </label>
            <button
              onClick={handleGenerateSlides}
              disabled={isLoading || !prompt || isEditing}
              className="flex-grow px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
              ) : 'Generate'}
            </button>
          </div>
        </div>

        {/* Slide Thumbnails */}
        <div className="flex-grow p-2 overflow-y-auto space-y-2">
          {slides.map((slide, index) => (
            <div
              key={index}
              onClick={() => { setCurrentSlide(index); if(window.innerWidth < 768) setShowMobileTools(false); }}
              className={`p-2 rounded cursor-pointer border-2 flex items-center space-x-3 ${currentSlide === index ? 'border-orange-500 bg-white dark:bg-gray-600' : 'border-transparent bg-gray-300 dark:bg-gray-600/50 hover:bg-gray-400 dark:hover:bg-gray-500/50'}`}
            >
              <span className="font-semibold text-sm">{index + 1}.</span>
              <div className="flex-grow">
                <p className="text-sm font-semibold truncate">{slide.title}</p>
              </div>
              {slide.imageBase64 && <div className="w-16 h-9 bg-gray-400 rounded-sm overflow-hidden flex-shrink-0"><img src={`data:image/png;base64,${slide.imageBase64}`} alt="slide preview" className="w-full h-full object-cover"/></div>}
            </div>
          ))}
        </div>

        {/* Edit and Transition Controls */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div>
                <h3 className="text-md font-semibold mb-2">Revise Slide with AI</h3>
                <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., 'Make the tone more professional'"
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                    disabled={!isActionable || isEditing || isLoading}
                />
                 <button
                    onClick={handleReviseSlide}
                    disabled={!isActionable || !editPrompt || isEditing || isLoading}
                    className="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                >
                  {isEditing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Revising...
                      </>
                  ) : 'Revise'}
                </button>
            </div>
            <div>
                <h3 className="text-md font-semibold mb-2">Slide Transition</h3>
                <select
                    value={activeSlide?.transition || 'none'}
                    onChange={handleTransitionChange}
                    disabled={!isActionable || isLoading || isEditing}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-md focus:ring-2 focus:ring-orange-500 focus:outline-none text-sm"
                >
                    <option value="none">None</option>
                    <option value="fade">Fade</option>
                    <option value="slide">Slide from Right</option>
                    <option value="zoom">Zoom</option>
                </select>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center space-x-2">
            <button
              onClick={handleDownload}
              disabled={!isActionable || isLoading || isEditing}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm"
            >
              Download PPTX
            </button>
        </div>
      </aside>
      
      {/* Main Slide View */}
      <main className="flex-grow bg-white dark:bg-gray-800 relative overflow-hidden">
        {isLoading ? (
            <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                <div className="w-24 h-24 relative mb-6">
                    <div className="absolute inset-0 border-4 border-orange-500/30 rounded-full animate-pulse"></div>
                    <div className="absolute inset-4 border-4 border-orange-500/30 rounded-full animate-pulse [animation-delay:-0.4s]"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-orange-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">AI is generating your slides...</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2 transition-opacity duration-500 w-64 text-center">{loadingMessage}</p>
            </div>
        ) : activeSlide ? (
          <div
              key={currentSlide}
              className={`absolute inset-0 p-4 md:p-12 flex items-center justify-center overflow-y-auto md:overflow-hidden ${getAnimationClass(activeSlide.transition)}`}
           >
              <div className="w-full h-full bg-white dark:bg-gray-900 shadow-2xl rounded-lg border-gray-200 dark:border-gray-700 border p-4 md:p-8 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
                  <div className={`w-full md:w-1/2 flex flex-col justify-center text-left ${currentSlide % 2 !== 0 ? 'md:order-2' : ''}`}>
                      <h1 className="text-xl md:text-4xl font-bold mb-4 md:mb-6 text-gray-800 dark:text-gray-100">{activeSlide.title}</h1>
                      <ul className="text-sm md:text-lg list-disc list-inside space-y-3 text-gray-600 dark:text-gray-300">
                          {activeSlide.content.map((point, i) => (
                              <li key={i}>{point}</li>
                          ))}
                      </ul>
                  </div>
                   <div className={`w-full md:w-1/2 flex items-center justify-center ${currentSlide % 2 !== 0 ? 'md:order-1' : ''}`}>
                      {activeSlide.imageBase64 ? 
                          <img src={`data:image/png;base64,${activeSlide.imageBase64}`} alt={activeSlide.title} className="max-w-full max-h-[200px] md:max-h-[450px] object-contain rounded-lg shadow-md" />
                          : <div className="w-full h-48 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-500">Image Area</div>
                      }
                  </div>
              </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Select a slide to view</div>
        )}
      </main>
    </div>
  );
};
