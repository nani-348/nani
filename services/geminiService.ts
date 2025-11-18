import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedCode, PortfolioData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const codeGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        html: {
            type: Type.STRING,
            description: "The HTML body content for the component. It should not include <html> or <body> tags.",
        },
        css: {
            type: Type.STRING,
            description: "The CSS styles for the component. It should not include <style> tags.",
        },
        js: {
            type: Type.STRING,
            description: "The JavaScript logic for the component. It should not include <script> tags.",
        },
    },
    required: ["html", "css", "js"],
};

export async function generatePortfolioFromData(data: PortfolioData): Promise<GeneratedCode> {
    const projectsString = data.projects.map(p => `
- Project Title: ${p.title}
  Description: ${p.description}
  Link: ${p.link}
`).join('');

    const contactFormInstruction = data.includeContactForm
        ? `
- Include a dedicated "Contact Me" section with a clean, functional form.
- The form should have fields for 'Name' (text input), 'Email' (email input), and 'Message' (textarea).
- Implement client-side validation (even if basic, like 'required' attributes).
- The form needs a visually prominent 'Submit' button.
- The JavaScript for the form should prevent the default submission behavior and, upon clicking the submit button, log the values of the Name, Email, and Message fields to the browser's console, providing user feedback (e.g., "Message sent!").
` : '';

    const skillsSectionInstruction = data.skills
        ? `
- Create a distinct "Skills" section.
- Present the following skills in an organized and visually appealing manner, perhaps as a list of tags, badges, or a grid: ${data.skills}.
` : `
- Create a distinct "Skills" section, even if no specific skills are provided. Generate a professional-looking placeholder or a common set of web development skills.
`;


    const generationPrompt = `
You are an expert web developer with 20 years of experience, specializing in creating stunning, professional, and highly functional personal portfolio websites.
Based on the following data, generate a complete, modern, responsive, and accessible website, demonstrating best practices in design and development.

**Theme/Style:** ${data.theme || 'modern, professional, elegant'}

**Personal Information:**
- Name: ${data.name || 'N/A'}
- Professional Title: ${data.title || 'N/A'}
- About Me Section: ${data.about || 'N/A'}
- Skills: ${data.skills || 'N/A'}
- Education: ${data.education || 'N/A'}
- Contact Email: ${data.email || 'N/A'}
- LinkedIn: ${data.linkedin || 'N/A'}
- GitHub: ${data.github || 'N/A'}

**Projects:**
${projectsString || 'No projects provided. Include a compelling placeholder if none are listed.'}

**Key Instructions for a 20-year Expert:**
-   **Semantic HTML5:** Use appropriate HTML5 semantic elements (e.g., <header>, <nav>, <main>, <section>, <article>, <footer>) for clear structure and accessibility.
-   **Modern & Responsive Design (Mobile-First):** Implement a mobile-first approach. The design must be fully responsive, adapting seamlessly to mobile, tablet, and desktop screens with elegant transitions. Utilize modern CSS techniques like Flexbox and CSS Grid for layout.
-   **Exceptional UI/UX:**
    *   **Typography:** Choose professional, readable fonts and ensure good typographic hierarchy.
    *   **Color Palette:** Apply a cohesive and appealing color scheme that aligns with the requested theme.
    *   **Spacing & Layout:** Maintain consistent spacing and a clean, uncluttered layout.
    *   **Accessibility (A11y):** Consider basic accessibility principles (e.g., proper contrast, semantic tags, aria-labels for interactive elements if necessary).
-   **Engaging Animations & Interactions:**
    *   **Scroll-Triggered Animations:** Animate sections and particularly the project cards so they subtly fade and slide into view as the user scrolls down. Implement this efficiently using the \`IntersectionObserver\` API in the JavaScript. The HTML for each element to be animated should have a class like \`scroll-animate\`. The CSS should define its pre-animation state (e.g., \`opacity: 0\`, \`transform: translateY(30px)\`) and a \`visible\` state (e.g., \`opacity: 1\`, \`transform: translateY(0)\`). The JS should add the \`visible\` class when the element enters the viewport, and then stop observing it for performance.
    *   Animate the main title in the hero section (e.g., a fade-in, subtle slide-in, or elegant typing effect).
    *   Incorporate subtle hover effects on interactive elements like project cards or navigation links to provide tactile feedback.
-   **Structure:**
    *   **Hero Section:** Design a compelling hero section with the name, title, and a strong call to action.
    *   **About Me Section:** A well-structured and engaging introduction.
    ${skillsSectionInstruction}
    *   **Projects Section:** Showcase projects clearly with titles, descriptions, and links. Make project cards interactive and visually appealing.
    ${contactFormInstruction}
    *   **Footer Section:** Include a professional footer with clickable social media icons for LinkedIn, GitHub, and Email. Use inline SVGs for modern icons. The email link should be a 'mailto:' link.
-   **Code Quality:** Generate clean, readable, well-organized, and performant HTML, CSS, and JavaScript. Ensure cross-browser compatibility.
-   Return the complete code in the specified JSON format.
`;

    const systemInstruction = `You are an expert web developer with 20 years of experience, specializing in creating stunning, professional, accessible, and high-performance personal portfolio websites.
You will be given user data and a theme. Your task is to generate the complete HTML, CSS, and JavaScript for a single-page portfolio website.
The code should adhere to modern web standards, be fully responsive (mobile-first), and exhibit exceptional UI/UX.
Provide the output as a single, valid JSON object that adheres precisely to the provided schema.
The HTML should only be the body content, using semantic HTML5. The CSS should be clean, modular, and efficient. The Javascript should be functional, performant, self-contained, and implement any required interactivity using modern APIs like IntersectionObserver for effects like scroll-triggered animations.
Do not include markdown formatting like \`\`\`json in your response.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro', // Using a more powerful model for better design generation
            contents: generationPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: codeGenerationSchema,
            },
        });
        
        const jsonString = response.text?.trim();
        
        if (!jsonString) {
             throw new Error("The AI returned an empty response. This may be due to the prompt being blocked by safety filters. Please try rephrasing your request.");
        }

        try {
            const generatedCode = JSON.parse(jsonString) as GeneratedCode;
            return generatedCode;
        } catch (e) {
            console.error("Failed to parse JSON response from Gemini:", jsonString);
            throw new Error("The AI returned a response that could not be understood. Please try again.");
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            if (error.message.includes('Rpc failed due to xhr error')) {
                throw new Error("A network error occurred while communicating with the AI. Please check your connection and try again.");
            }
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}


export async function generateCode(prompt: string, existingCode?: GeneratedCode): Promise<GeneratedCode> {
    const modificationInstruction = existingCode
        ? `
    Here is the existing code that needs to be modified:
    ---HTML---
    ${existingCode.html}
    ---CSS---
    ${existingCode.css}
    ---JS---
    ${existingCode.js}
    ---
    Based on this existing code, apply the following change: "${prompt}".
    Return the complete, updated code in the JSON format. Do not omit any part of the original code that should be kept. If a section (HTML, CSS, or JS) is unchanged, return it as it was.
    `
        : `
    Based on the user's prompt, generate the necessary HTML, CSS, and JavaScript code.
    User prompt: "${prompt}"
    `;

    const systemInstruction = `You are an expert web developer specializing in concise, self-contained components. You will be given a user prompt, and optionally some existing code. Your task is to generate or modify the code to satisfy the user's request.
The code should be ready to be rendered in a browser sandbox.
Provide the output as a single, valid JSON object that adheres to the provided schema.
The HTML should only be the body content. The CSS should be clean and modern. The Javascript should be functional, self-contained, and use modern, performant techniques (e.g., IntersectionObserver for scroll animations).
Do not include markdown formatting like \`\`\`html in your response.
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: modificationInstruction,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: codeGenerationSchema,
            },
        });
        
        const jsonString = response.text?.trim();
        
        if (!jsonString) {
             throw new Error("The AI returned an empty response. This may be due to the prompt being blocked by safety filters. Please try rephrasing your request.");
        }

        try {
            const generatedCode = JSON.parse(jsonString) as GeneratedCode;
            return generatedCode;
        } catch (e) {
            console.error("Failed to parse JSON response from Gemini:", jsonString);
            throw new Error("The AI returned a response that could not be understood. Please try again.");
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            if (error.message.includes('Rpc failed due to xhr error')) {
                throw new Error("A network error occurred while communicating with the AI. Please check your connection and try again.");
            }
            throw new Error(`Gemini API Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while communicating with the Gemini API.");
    }
}