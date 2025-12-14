# Web Summarize

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern AI-powered web page summarizer built with Next.js 16, React 19, and the Vercel AI SDK. Enter any URL and get a concise summary in your preferred language using state-of-the-art LLMs from OpenAI, Anthropic, Google, Mistral, and more.

![Web Summarize Demo](https://via.placeholder.com/800x400?text=Web+Summarize+Demo)

## ✨ Features

- **🌐 Universal Web Scraping** — Fetch and extract content from any publicly accessible webpage
- **🤖 Multi-Model Support** — Choose from 5 cutting-edge AI models: GPT-4.1, Claude Sonnet 4.5, Gemini 2.5 Flash, Mistral Large, and Llama 3.3 70B
- **🌍 10 Languages** — Generate summaries in English, French, Spanish, German, Italian, Portuguese, Chinese, Russian, Hindi, or Japanese
- **⚡ Real-Time Streaming** — Watch summaries generate token-by-token with live progress updates
- **📱 Responsive Design** — Beautiful UI built with Tailwind CSS v4 and Radix UI primitives
- **🔒 Server-Side Processing** — Secure API key handling with Next.js Server Actions
- **📝 Markdown Output** — Rich formatting with headers, bullet points, and emphasis

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18.17 or later
- [npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/)
- At least one AI provider API key (see [Environment Variables](#environment-variables))

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/brown2020/web-summarize.git
   cd web-summarize
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:

   ```bash
   # Required: At least one AI provider
   OPENAI_API_KEY=sk-...

   # Optional: Additional AI providers
   ANTHROPIC_API_KEY=sk-ant-...
   GOOGLE_GENERATIVE_AI_API_KEY=...
   MISTRAL_API_KEY=...
   FIREWORKS_API_KEY=...
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📖 Usage

1. **Enter a URL** — Paste any webpage URL (protocol is auto-added if missing)
2. **Select Language** — Choose your preferred output language
3. **Choose AI Model** — Pick from available LLM providers
4. **Set Word Count** — Specify summary length (50-1000 words)
5. **Generate** — Click "Scrape and Summarize" and watch the magic happen!

## 🏗️ Project Structure

```
web-summarize/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── proxy/
│   │   │       └── route.ts       # Proxy API for fetching & extracting webpage content
│   │   ├── globals.css            # Tailwind CSS v4 theme configuration
│   │   ├── layout.tsx             # Root layout with metadata
│   │   └── page.tsx               # Home page entry point
│   ├── actions/
│   │   └── generateActions.ts     # Server Actions for AI streaming
│   ├── components/
│   │   ├── ui/                    # Reusable UI components (Radix-based)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── progress.tsx
│   │   │   └── select.tsx
│   │   ├── ScrapeSummarize.tsx    # Main summarizer container
│   │   └── SummarizerForm.tsx     # Form with URL input and options
│   ├── constants/
│   │   ├── app.ts                 # App-wide constants (timeouts, validation)
│   │   └── summarizer.ts          # Model options and language list
│   ├── hooks/
│   │   └── useSummarizer.ts       # Core summarization logic hook
│   ├── lib/
│   │   └── utils.ts               # Utility functions (cn, capitalize)
│   ├── store/
│   │   └── summarizerStore.ts     # Zustand global state management
│   ├── types/
│   │   └── summarizer.ts          # TypeScript types and Zod schemas
│   └── utils/
│       └── url-validation.ts      # URL validation and normalization
├── .env.local                     # Environment variables (not committed)
├── next.config.mjs                # Next.js configuration
├── package.json                   # Dependencies and scripts
├── postcss.config.mjs             # PostCSS configuration
├── tailwind.config.ts             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
```

## 🔧 Environment Variables

| Variable                       | Required | Description                             |
| ------------------------------ | -------- | --------------------------------------- |
| `OPENAI_API_KEY`               | Yes\*    | OpenAI API key for GPT-4.1              |
| `ANTHROPIC_API_KEY`            | No       | Anthropic API key for Claude Sonnet 4.5 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | No       | Google AI API key for Gemini 2.5 Flash  |
| `MISTRAL_API_KEY`              | No       | Mistral API key for Mistral Large       |
| `FIREWORKS_API_KEY`            | No       | Fireworks API key for Llama 3.3 70B     |

\*At least one AI provider API key is required. OpenAI is the default fallback.

## 🛠️ Tech Stack

### Core Framework

| Package                                       | Version | Purpose                                                    |
| --------------------------------------------- | ------- | ---------------------------------------------------------- |
| [Next.js](https://nextjs.org/)                | 16.x    | React framework with App Router, Server Actions, Turbopack |
| [React](https://react.dev/)                   | 19.x    | UI library with latest features                            |
| [TypeScript](https://www.typescriptlang.org/) | 5.x     | Type safety and developer experience                       |

### AI & LLM Integration

| Package                                                                                 | Version | Purpose                                 |
| --------------------------------------------------------------------------------------- | ------- | --------------------------------------- |
| [ai](https://sdk.vercel.ai/)                                                            | 5.x     | Vercel AI SDK core for streaming        |
| [@ai-sdk/openai](https://sdk.vercel.ai/providers/ai-sdk-providers/openai)               | 2.x     | OpenAI GPT-4.1 + OpenAI-compatible APIs |
| [@ai-sdk/anthropic](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic)         | 2.x     | Anthropic Claude Sonnet 4.5             |
| [@ai-sdk/google](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai) | 2.x     | Google Gemini 2.5 Flash                 |
| [@ai-sdk/mistral](https://sdk.vercel.ai/providers/ai-sdk-providers/mistral)             | 2.x     | Mistral Large                           |
| [@ai-sdk/rsc](https://sdk.vercel.ai/docs/ai-sdk-rsc)                                    | 1.x     | React Server Components streaming       |

> **Note:** Llama 3.3 70B uses Fireworks via the OpenAI-compatible provider (`createOpenAI`).

### UI & Styling

| Package                                                      | Version | Purpose                      |
| ------------------------------------------------------------ | ------- | ---------------------------- |
| [Tailwind CSS](https://tailwindcss.com/)                     | 4.x     | Utility-first CSS framework  |
| [@radix-ui/react-\*](https://www.radix-ui.com/)              | 2.x     | Accessible UI primitives     |
| [class-variance-authority](https://cva.style/)               | 0.7.x   | Component variant management |
| [lucide-react](https://lucide.dev/)                          | 0.5x    | Icon library                 |
| [react-markdown](https://github.com/remarkjs/react-markdown) | 10.x    | Markdown rendering           |

### State & Data

| Package                                  | Version | Purpose                      |
| ---------------------------------------- | ------- | ---------------------------- |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.x     | Lightweight state management |
| [Zod](https://zod.dev/)                  | 4.x     | Schema validation            |
| [Axios](https://axios-http.com/)         | 1.x     | HTTP client                  |
| [Cheerio](https://cheerio.js.org/)       | 1.x     | Server-side HTML parsing     |

### Utilities

| Package                                                     | Version | Purpose                |
| ----------------------------------------------------------- | ------- | ---------------------- |
| [react-hot-toast](https://react-hot-toast.com/)             | 2.x     | Toast notifications    |
| [clsx](https://github.com/lukeed/clsx)                      | 2.x     | Conditional classNames |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | 3.x     | Merge Tailwind classes |

## 🔄 How It Works

### Architecture Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Browser   │────▶│  /api/proxy  │────▶│  Target Website │
│  (Client)   │◀────│   (Server)   │◀────│                 │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                                          │
       │            ┌──────────────┐              │
       │            │   Cheerio    │◀─────────────┘
       │            │  (Extract)   │   Raw HTML
       │            └──────────────┘
       │                   │
       │              Plain Text
       │                   ▼
       │            ┌──────────────┐     ┌─────────────────┐
       │            │   Server     │────▶│   AI Provider   │
       └───────────▶│   Action     │◀────│  (OpenAI, etc.) │
         Stream     └──────────────┘     └─────────────────┘
```

### Streaming Implementation

The app uses the Vercel AI SDK's `createStreamableValue` for real-time token streaming:

```typescript
// Server Action (generateActions.ts)
const result = streamText({
  model,
  messages,
  temperature: 0.7,
});

const stream = createStreamableValue(result.textStream);
return stream.value;

// Client Hook (useSummarizer.ts)
for await (const content of readStreamableValue(result)) {
  if (content) {
    setSummary(content.trim());
    // Update progress based on content length
  }
}
```

## 📜 Available Scripts

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start development server with Turbopack |
| `npm run build` | Build for production                    |
| `npm run start` | Start production server                 |
| `npm run lint`  | Run ESLint                              |

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing code style (Prettier + ESLint)
- Write meaningful commit messages
- Add tests for new features when applicable
- Update documentation as needed

## 📋 Roadmap

- [ ] Add support for PDF documents
- [ ] Implement summary history/caching
- [ ] Add user authentication
- [ ] Support for Q&A mode (ask questions about content)
- [ ] Browser extension
- [ ] API endpoint for programmatic access

## 🐛 Known Issues

- Some websites with aggressive bot protection may not be scrapeable
- Very long pages may hit token limits on some models

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Contact

For questions, feedback, or support:

- **Email**: [info@ignitechannel.com](mailto:info@ignitechannel.com)
- **GitHub Issues**: [Create an issue](https://github.com/brown2020/web-summarize/issues)

---

<p align="center">
  Built with ❤️ using <a href="https://nextjs.org">Next.js</a> and the <a href="https://sdk.vercel.ai">Vercel AI SDK</a>
</p>
