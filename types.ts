
export interface GeneratedCode {
  html: string;
  css: string;
  js: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  suggestions?: string[];
}

export interface ProjectData {
    title: string;
    description: string;
    link: string;
}

export interface PortfolioData {
    name?: string;
    title?: string;
    about?: string;
    skills?: string; // Added new property for user skills
    education?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    projects: ProjectData[];
    theme?: string;
    includeContactForm?: boolean;
}
