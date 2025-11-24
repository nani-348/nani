
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Fix: Per coding guidelines, API_KEY must be used directly from process.env.
const globalAi = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Per coding guidelines, API_KEY must be used directly from process.env.
export const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface Source {
    title: string;
    uri: string;
}

export interface GroundedResponse {
    text: string;
    sources: Source[];
}

export const generateText = async (prompt: string): Promise<string> => {
  try {
    const response = await globalAi.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating text:", error);
    return "Error: Could not generate text.";
  }
};

export const generateSpreadsheetData = async (prompt: string): Promise<Record<string, string>[]> => {
  try {
    const response = await globalAi.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following prompt, generate an array of JSON objects. Each object should have key-value pairs suitable for a table. The keys should be consistent across all objects. Prompt: "${prompt}"`,
      config: {
        responseMimeType: 'application/json',
      }
    });
    
    // The response text is a JSON string, sometimes wrapped in markdown backticks
    let jsonString = response.text.trim();
    if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7, jsonString.length - 3).trim();
    } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3, jsonString.length - 3).trim();
    }
    
    const data = JSON.parse(jsonString);
    if(Array.isArray(data)) {
        return data;
    }
    return [];

  } catch (error) {
    console.error('Error generating spreadsheet data:', error);
    return [{ error: 'Failed to generate data.' }];
  }
};

export interface Slide {
    title: string;
    content: string[];
    imageBase64?: string;
    transition?: 'none' | 'fade' | 'slide' | 'zoom';
}

export const generateImageForSlide = async (prompt: string): Promise<string> => {
    try {
        const response = await globalAi.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // Safely access the image data to prevent crashes
        const firstCandidate = response?.candidates?.[0];
        const inlineData = firstCandidate?.content?.parts?.find(part => part.inlineData)?.inlineData;

        if (inlineData?.data) {
            return inlineData.data;
        }
        
        console.warn("No image data found in slide generation response for prompt:", prompt);
        return "";
    } catch (error) {
        console.error("Error generating slide image:", error);
        // Re-throw the error to be handled by the calling function.
        throw error; 
    }
};

export const generatePresentation = async (topic: string, slideCount: number): Promise<Slide[]> => {
    try {
        const textResponse = await globalAi.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: `Create a ${slideCount}-slide presentation on the topic: "${topic}". For each slide, provide a clear title and 4-5 detailed bullet points for the slide content.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {
                                type: Type.STRING,
                                description: "The title of the slide."
                            },
                            content: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.STRING
                                },
                                description: "An array of 4-5 detailed bullet points for the slide content."
                            }
                        },
                        required: ["title", "content"]
                    }
                }
            }
        });

        let slides: Slide[] = JSON.parse(textResponse.text.trim());

        // Generate images sequentially to avoid rate limiting errors.
        for (const slide of slides) {
            try {
                const imageBase64 = await generateImageForSlide(`An illustrative, professional, and simple image for a presentation slide titled: "${slide.title}" about "${topic}".`);
                if (imageBase64) {
                    slide.imageBase64 = imageBase64;
                }
            } catch (imageError) {
                // Log the error for the specific slide but don't fail the entire presentation.
                console.warn(`Could not generate image for slide "${slide.title}":`, imageError);
            }
        }

        return slides;

    } catch (error) {
        console.error('Error generating presentation:', error);
        return [{ title: 'Error', content: ['Failed to generate presentation content.'] }];
    }
};

export const editSlide = async (currentSlide: Slide, topic: string, editPrompt: string): Promise<Slide> => {
    try {
      const textResponse = await globalAi.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `You are a presentation assistant. Given the following slide about "${topic}", modify it based on the user's request.
        Original Title: "${currentSlide.title}"
        Original Content Bullet Points:
        - ${currentSlide.content.join('\n- ')}
        
        User Request: "${editPrompt}"
        
        Return ONLY the updated slide in JSON format with "title" and "content" (an array of strings for bullet points) keys.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "The updated title of the slide." },
              content: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "The updated array of bullet points for the slide content."
              }
            },
            required: ["title", "content"]
          }
        }
      });

      const updatedText: { title: string; content: string[] } = JSON.parse(textResponse.text.trim());

      const imageBase64 = await generateImageForSlide(`An illustrative, professional, and simple image for a presentation slide titled: "${updatedText.title}" about "${topic}".`);

      return { ...updatedText, imageBase64 };
    } catch (error) {
        console.error("Error editing slide:", error);
        throw new Error("Failed to revise the slide. Please try again.");
    }
};

export const generateVideo = async (
  prompt: string,
  imageBase64: string,
  mimeType: string,
  aspectRatio: '16:9' | '9:16'
): Promise<string> => {
  try {
    const ai = getAi();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("Video generation succeeded but no download link was found.");
    }
    
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!videoResponse.ok) {
        throw new Error(`Failed to download video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    return videoUrl;

// Fix: Added an opening brace to the catch block to correctly handle errors.
  } catch (error) {
    console.error("Error generating video:", error);
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    if (errorMessage.includes("Requested entity was not found.")) {
      throw new Error("API key is invalid. Please select a valid key.");
    }
    throw new Error("Failed to generate video.");
  }
};

export interface CodeFile {
  fileName: string;
  code: string;
}

export const generateOrModifyCode = async (prompt: string, existingFiles?: CodeFile[]): Promise<CodeFile[]> => {
    let fullPrompt: string;
    const hasExistingCode = existingFiles && existingFiles.length > 0 && existingFiles[0].fileName !== 'welcome.md';

    if (hasExistingCode) {
        fullPrompt = `You are an expert code modification assistant. Below is a set of files in a JSON array format. Your task is to modify these files based on the user's request. You MUST return the complete, updated file structure in the same JSON array format. Do not omit any files. If you add a file, add it to the array. If you delete a file, remove its object from the array.

Current Files:
${JSON.stringify(existingFiles)}

User Request:
"${prompt}"

Return only the JSON array of the updated file structure.`;
    } else {
        fullPrompt = `You are an expert code generation assistant. Based on the following prompt, generate a complete file structure as a JSON array of objects. Each object must have two keys: "fileName" (a string with the full file name and extension) and "code" (a string containing the file's content). Create all necessary files for a complete, runnable example. Ensure the code is vanilla HTML, CSS, and JavaScript that can run directly in a browser without any build process (e.g., no React, JSX, or TS). The main HTML file should be named 'index.html'. Prompt: "${prompt}"`;
    }

    try {
        const response = await globalAi.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            fileName: { type: Type.STRING, description: "The full name of the file, including its extension." },
                            code: { type: Type.STRING, description: "The complete code content for the file." }
                        },
                        required: ["fileName", "code"]
                    }
                }
            }
        });
        
        let jsonString = response.text.trim();
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
            return data;
        }
        return [{ fileName: 'error.txt', code: 'Failed to parse project structure from model response.' }];

    } catch (error) {
        console.error("Error generating/modifying code:", error);
        return [{ fileName: 'error.txt', code: `/* Error: Could not process request.\n${error} */` }];
    }
};


export const generateGroundedResponse = async (prompt: string, systemInstruction?: string): Promise<GroundedResponse> => {
    try {
        const response = await globalAi.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                ...(systemInstruction && { systemInstruction }),
            },
        });

        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
        
        const sources: Source[] = groundingChunks
            .map(chunk => chunk.web)
            .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title)
            .reduce((acc, current) => { // De-duplicate sources
                if (!acc.find(item => item.uri === current.uri)) {
                    acc.push(current);
                }
                return acc;
            }, [] as Source[]);

        return { text, sources };
    } catch (error) {
        console.error("Error generating grounded response:", error);
        return {
            text: "Error: I was unable to process your request. Please try again.",
            sources: [],
        };
    }
};

export async function* generateGroundedResponseStream(
    prompt: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    systemInstruction?: string,
): AsyncGenerator<{ textChunk?: string; sources?: Source[] }> {
    try {
        const ai = getAi();
        const responseStream = await ai.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: [...history, { role: 'user', parts: [{ text: prompt }] }],
            config: {
                tools: [{ googleSearch: {} }],
                ...(systemInstruction && { systemInstruction }),
            },
        });

        let aggregatedSources: Source[] = [];
        
        for await (const chunk of responseStream) {
            const textChunk = chunk.text;
            if (textChunk) {
                yield { textChunk };
            }

            const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
            const newSources: Source[] = groundingChunks
                .map(chunk => chunk.web)
                .filter((web): web is { uri: string; title: string } => !!web && !!web.uri && !!web.title);

            newSources.forEach(source => {
                if (!aggregatedSources.some(s => s.uri === source.uri)) {
                    aggregatedSources.push(source);
                }
            });
        }
        yield { sources: aggregatedSources };

    } catch (error) {
        console.error("Error in streaming grounded response:", error);
        yield { textChunk: "\n\nError: I was unable to process your request. Please try again." };
        yield { sources: [] };
    }
}


export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
    try {
        const imagePart = {
            inlineData: {
                mimeType,
                data: base64ImageData,
            },
        };
        const textPart = {
            text: prompt,
        };
        const response = await globalAi.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // Safely access the image data to prevent crashes
        const firstCandidate = response?.candidates?.[0];
        const inlineData = firstCandidate?.content?.parts?.find(part => part.inlineData)?.inlineData;

        if (inlineData?.data) {
            return inlineData.data;
        }

        throw new Error("No image data found in response.");
    } catch (error) {
        console.error("Error editing image:", error);
        throw new Error("Failed to edit image.");
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const ai = getAi();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            // Correctly formatted as array of contents, which corresponds to the API expectations for TTS
            contents: [{ parts: [{ text: `Say this text in a friendly, natural voice: ${text}` }] }],
            config: {
                // Use string literal to ensure compatibility and avoid potential enum issues at runtime
                responseModalities: ['AUDIO'], 
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        // Handle cases where the model might fallback to text (e.g. safety filter or confusion)
        const textFallback = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if(textFallback && !base64Audio) {
             console.warn("GenerateSpeech returned text instead of audio:", textFallback);
             throw new Error("Model returned text instead of audio. Please try a different phrase.");
        }

        if (!base64Audio) {
            console.warn("GenerateSpeech response missing audio data. Response:", JSON.stringify(response, null, 2));
            throw new Error("No audio data received from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error; // Propagate the specific error message
    }
};

export const generatePortfolioFromResume = async (resumeImageBase64: string, resumeMimeType: string): Promise<CodeFile[]> => {
    try {
        // Step 1: Analyze the resume image and extract structured data
        const imagePart = {
            inlineData: {
                mimeType: resumeMimeType,
                data: resumeImageBase64,
            },
        };
        const textPart = {
            text: "Analyze this resume document (image or PDF) and extract all key information in a structured JSON format. Include name, contact info (email, phone, linkedin, website), a professional summary, a list of skills, work experience (company, role, dates, description bullet points), projects (name, description, technologies used), and education (institution, degree, dates). Ensure the output is only the JSON object.",
        };

        const analysisResponse = await globalAi.models.generateContent({
            model: "gemini-2.5-flash", // Good for multimodal and JSON
            contents: { parts: [imagePart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        contact: {
                            type: Type.OBJECT,
                            properties: {
                                email: { type: Type.STRING },
                                phone: { type: Type.STRING },
                                linkedin: { type: Type.STRING },
                                website: { type: Type.STRING },
                            }
                        },
                        summary: { type: Type.STRING },
                        skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                        experience: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    company: { type: Type.STRING },
                                    role: { type: Type.STRING },
                                    dates: { type: Type.STRING },
                                    description: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                                required: ["company", "role", "dates", "description"]
                            }
                        },
                        projects: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                                },
                                required: ["name", "description"]
                            }
                        },
                        education: {
                             type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    institution: { type: Type.STRING },
                                    degree: { type: Type.STRING },
                                    dates: { type: Type.STRING },
                                },
                                required: ["institution", "degree", "dates"]
                            }
                        }
                    },
                    required: ["name", "summary", "skills", "experience", "education"]
                }
            }
        });

        const resumeData = JSON.parse(analysisResponse.text.trim());

        // Step 2: Use the extracted data to generate a portfolio website
        const portfolioPrompt = `Based on the following resume data, create a professional, single-page portfolio website using vanilla HTML, CSS, and JavaScript. The website should be visually appealing, modern, and responsive, with a clean design. It should have a hero section with the person's name and a short summary. It must include sections for Skills, Work Experience, Projects, and Education, plus a footer with contact information and links. Add some smooth scroll animations with JavaScript.

Resume Data:
${JSON.stringify(resumeData, null, 2)}`;

        // Re-use the existing code generation function
        const portfolioFiles = await generateOrModifyCode(portfolioPrompt);
        return portfolioFiles;

    } catch (error) {
        console.error("Error generating portfolio from resume:", error);
        return [{ fileName: 'error.txt', code: `/* Error: Could not generate portfolio.\n${error} */` }];
    }
};

export const generatePortfolioFromText = async (description: string): Promise<CodeFile[]> => {
    try {
        const portfolioPrompt = `Based on the following description, create a professional, single-page portfolio website using vanilla HTML, CSS, and JavaScript. The website should be visually appealing, modern, and responsive, with a clean design. It should have a hero section with the person's name and a short summary. It must include sections for Skills, Work Experience, Projects, and Education, plus a footer with contact information and links, if provided in the description. Add some smooth scroll animations with JavaScript.

User's Description:
"${description}"`;

        // Re-use the existing code generation function
        const portfolioFiles = await generateOrModifyCode(portfolioPrompt);
        return portfolioFiles;

    } catch (error) {
        console.error("Error generating portfolio from text:", error);
        return [{ fileName: 'error.txt', code: `/* Error: Could not generate portfolio.\n${error} */` }];
    }
};
