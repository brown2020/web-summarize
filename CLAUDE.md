# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Web-Summarize is a Next.js 16 application that scrapes web pages and generates AI-powered summaries using multiple LLM providers (OpenAI, Anthropic, Google, Mistral, Fireworks/Llama). It features server-side content extraction, streaming AI responses, and a clean React UI.

## Commands

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm test` - Run Vitest tests
- `npm run test:watch` - Run tests in watch mode

## Architecture

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/proxy/route.ts   # Server-side HTML fetching and text extraction
│   ├── error.tsx            # Error boundary
│   ├── layout.tsx           # Root layout
│   ├── not-found.tsx        # 404 page
│   ├── page.tsx             # Homepage (server component)
│   ├── privacy/page.tsx     # Privacy policy
│   └── terms/page.tsx       # Terms of service
├── actions/                 # Server Actions
│   └── generateActions.ts   # AI summarization with streaming
├── components/              # React components
│   ├── ui/                  # Radix UI + Shadcn primitives
│   ├── ScrapeSummarize.tsx  # Main client component orchestrator
│   └── SummarizerForm.tsx   # Form inputs
├── constants/               # Application constants
│   ├── app.ts              # Progress steps, timeouts, validation limits
│   └── summarizer.ts       # Languages, model catalog
├── hooks/                   # Custom React hooks
│   └── useSummarizer.ts    # Scraping and summarization workflow
├── lib/                     # Utilities
│   ├── utils.ts            # Helper functions (cn, capitalize, clampNumber)
│   └── model-availability.ts # Environment-based model filtering
├── store/                   # State management
│   └── summarizerStore.ts  # Zustand store
├── types/                   # TypeScript types and Zod schemas
│   └── summarizer.ts
└── utils/                   # Utility functions
    ├── url-validation.ts    # URL parsing and security validation
    └── network.ts           # Private IP detection
```

### Key Patterns

1. **Server-side Content Extraction**: `/api/proxy` uses Cheerio to parse HTML, preventing CORS issues and enabling SSRF protection

2. **Streaming AI Responses**: Server actions use `streamText()` + `createStreamableValue()` from Vercel AI SDK; clients read via `readStreamableValue()`

3. **State Management**: Zustand store (`useSummarizerStore`) holds form state, extracted text, summary, and UI state

4. **Race Condition Prevention**: `useSummarizer` hook uses run IDs and abort controllers to prevent stale updates

5. **Multi-layer Validation**: URL validation happens client-side (UX), in forms (sanity), and server-side (security)

6. **Environment-driven Model Availability**: Models are filtered based on which API keys are configured in environment variables

### Data Flow

```
User submits URL → /api/proxy extracts text → generateSummary() server action →
Stream AI response → Display summary with export options
```

## Environment Variables

Required API keys (at least one needed):
- `OPENAI_API_KEY` - For GPT-4.1 (default model)
- `ANTHROPIC_API_KEY` - For Claude Sonnet 4.5
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Gemini 2.5 Flash
- `MISTRAL_API_KEY` - For Mistral Large
- `FIREWORKS_API_KEY` - For Llama 3.3 70B

See `.env.example` for reference.

## Important Implementation Details

- **Content Limits**: Extracted text capped at 50,000 characters; max fetch size 1MB
- **Security**: Private IPs blocked, DNS pinning for SSRF prevention, embedded credentials rejected
- **Progress Tracking**: 5 stages (0 → 20 → 50 → 70 → 100) with corresponding labels
- **Deep Linking**: URL params (`url`, `lang`, `model`, `words`) enable shareable configurations
