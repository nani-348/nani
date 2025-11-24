<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# macOS Simulator - AI-Powered Desktop Experience

A fully functional macOS-style desktop simulator built with React, TypeScript, and Google's Gemini AI. Features multiple productivity apps including PowerPoint maker, Word processor, Excel spreadsheet, video generator, image studio, and more.

## Features

- 🖥️ **Full macOS UI**: Complete with menu bar, dock, window management, and Exposé view
- 🤖 **AI-Powered Apps**: 
  - PowerPoint presentation generator
  - Word processor with AI assistance
  - Excel spreadsheet with AI data generation
  - Video generator (Veo)
  - Image studio with AI editing
  - Voice assistant (Nani)
  - Portfolio maker from resume
  - Browser and Google search
- 📱 **Responsive Design**: Works on desktop and mobile devices
- ⌨️ **Keyboard Shortcuts**: Customizable shortcuts for quick app access
- 🎨 **Customizable**: Change wallpapers and personalize your experience

## Run Locally

**Prerequisites:** Node.js 18+ and npm

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-name>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up your API key**
   - Copy `.env.example` to `.env.local`
   - Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Add it to `.env.local`:
     ```
     API_KEY=your_actual_api_key_here
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:5173`

## Deploy to GitHub Pages

1. **Push your code to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Add your API key as a GitHub Secret**
   - Go to your repository on GitHub
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `GEMINI_API_KEY`
   - Value: Your actual Gemini API key
   - Click "Add secret"

3. **Enable GitHub Pages**
   - Go to Settings → Pages
   - Source: "GitHub Actions"
   - The workflow will automatically deploy on push to main

4. **Access your deployed app**
   - Your app will be available at: `https://<your-username>.github.io/<repo-name>/`
   - Check the Actions tab to monitor deployment progress

## Alternative Deployment Options

### Netlify
The project includes `netlify.toml` for easy Netlify deployment:
1. Connect your GitHub repo to Netlify
2. Add `API_KEY` environment variable in Netlify dashboard
3. Deploy automatically on push

### Vercel
The project includes `vercel.json` for Vercel deployment:
1. Import your GitHub repo to Vercel
2. Add `API_KEY` environment variable in Vercel dashboard
3. Deploy automatically on push

## Project Structure

```
├── components/          # React components
│   ├── apps/           # Individual app components
│   ├── Dock.tsx        # macOS-style dock
│   ├── MenuBar.tsx     # Top menu bar
│   ├── Window.tsx      # Window management
│   └── ExposeView.tsx  # Window overview
├── services/           # Service layer
│   ├── geminiService.ts      # AI integration
│   ├── audioService.ts       # Sound effects
│   ├── fileSystemService.ts  # File management
│   └── shortcutsService.ts   # Keyboard shortcuts
├── App.tsx             # Main application
├── types.ts            # TypeScript definitions
└── constants.tsx       # App definitions and icons
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Google Gemini AI** - AI capabilities
- **PptxGenJS** - PowerPoint generation
- **JSZip** - File compression

## Keyboard Shortcuts

- `Cmd/Ctrl + ↓` - Toggle Exposé view
- `Esc` - Exit Exposé view
- Custom shortcuts can be configured in the Shortcuts app

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
