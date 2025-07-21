# WordFrame

Transform your photos into interactive ASCII art word search puzzles. Where creativity meets technology.

## 🎯 Project Overview

WordFrame is a web application that converts photos to ASCII art and creates word search puzzles from them. Upload any photo and watch our advanced AI transform it into beautiful ASCII art, then weave carefully selected words into the artwork, creating a word search puzzle that maintains the essence of your original image while adding layers of interactive fun.

## 🚀 Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS with custom color scheme
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Package Manager**: Bun

## 🎨 Design System

**Primary Colors:**
- Purple: `purple-600`, `purple-50` (primary brand)
- Pink: `pink-500`, `pink-300` (accent/CTA)
- Blue: `blue-600`, `indigo-700` (supporting)
- Gradients: Purple-to-pink, blue-to-indigo combinations

## ✨ Key Features

- **Photo to ASCII Conversion**: Transform any image into beautiful ASCII art
- **Interactive Word Search**: Words are woven into the ASCII artwork
- **Parallax Effects**: Smooth scrolling with parallax backgrounds
- **Responsive Design**: Mobile-first design with modern UI
- **Real-time Processing**: No downloads or installations required
- **Modular Components**: Clean, reusable React components

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── Header.tsx        # Fixed navigation with brand and CTA
│   ├── Hero.tsx          # Full-screen hero with parallax background
│   ├── HowItWorks.tsx    # 3-step process explanation
│   ├── Gallery.tsx       # Example showcases
│   ├── CallToAction.tsx  # Final conversion section
│   ├── Footer.tsx        # Links, social media, company info
│   ├── AboutPage.tsx     # About page with mission and features
│   ├── PuzzleBuilder.tsx # Main puzzle creation interface
│   └── WordSearchGrid.tsx # Interactive word search component
├── lib/                  # Utilities and stores
└── App.tsx              # Main application component
```

## 🛠️ Development Setup

1. **Install dependencies** (using Bun):
   ```bash
   bun install
   ```

2. **Start development server**:
   ```bash
   bun dev
   ```

3. **Build for production**:
   ```bash
   bun build
   ```

4. **Preview production build**:
   ```bash
   bun preview
   ```

## 🎮 How It Works

1. **Upload Photo**: Choose any image from your device
2. **AI Processing**: Advanced algorithms convert your photo to ASCII art
3. **Word Integration**: Carefully selected words are woven into the artwork
4. **Interactive Puzzle**: Solve the word search while enjoying your ASCII art

## 🎨 Component Architecture

All components are built with:
- **Parallax Effects**: Components accept `scrollY` prop for different movement speeds
- **Color Consistency**: Purple/pink/blue gradient theme throughout
- **Responsive Design**: Mobile-first with `md:` breakpoints
- **Hover Animations**: Cards scale and shadow effects
- **CTA Focus**: Multiple "Create Your Puzzle" call-to-actions

## 📱 Browser Support

Modern browsers with ES6+ support:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## 🤝 Contributing

This is a landing page project showcasing the WordFrame concept. For contributions or feature requests, please refer to the project guidelines in `.cursorrules`.

## 🌐 Static Hosting Configuration

For the AI background removal to work in production, your static host needs to set specific headers to enable SharedArrayBuffer support:

### Cloudflare Pages
The `public/_headers` file is already configured. No additional setup needed. Cloudflare Pages will automatically apply these headers.

### Netlify
The `public/_headers` file is already configured. No additional setup needed.

### Vercel
The `vercel.json` file is already configured. No additional setup needed.

### GitHub Pages
Use the included GitHub Actions workflow in `.github/workflows/deploy.yml`. 
**Note**: GitHub Pages has limitations with CORS headers, so the canvas fallback will be used.

### Apache Servers
The `public/.htaccess` file is already configured for Apache servers.

### Nginx
Add this to your nginx configuration:
```nginx
location / {
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;
}
```

### Other Static Hosts
If your host doesn't support the required headers, the app will automatically fall back to the canvas-based background removal method, which works without special requirements.

## 🔧 Testing Static Build Locally

To test the static build with proper headers:

```bash
# Build the project
bun run build

# Test with a local server that supports headers (using serve with CORS)
bunx serve dist -c serve.json
```

Create `serve.json` in your project root:
```json
{
  "headers": [
    {
      "source": "**/*",
      "headers": [
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        },
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        }
      ]
    }
  ]
}
```

## 📄 License

This project is part of the WordFrame application suite.
