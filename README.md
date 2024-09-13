# Scrape and Summarize Webpage

A Next.js 14 application that scrapes a webpage, processes the content, and generates a concise summary using AI. This project utilizes server actions, streaming responses, and dynamic state management to provide real-time content summarization. The app showcases how to effectively use the Vercel AI SDK to build an AI-powered summarization tool with a seamless user experience.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Components](#components)
- [API Routes](#api-routes)
- [Technologies Used](#technologies-used)
- [Using Vercel AI SDK](#using-vercel-ai-sdk)
- [Streaming Technique](#streaming-technique)
- [Contributing](#contributing)
- [Contact](#contact)
- [License](#license)

## Features

- **Scrape Webpages:** Enter a URL to fetch and scrape content from the specified webpage.
- **AI-Powered Summarization:** Leverage AI models to generate a summary in the desired language.
- **Real-Time Streaming:** Display the summary in real-time as it's being generated.
- **Progress Feedback:** Visual progress bar indicating the status of scraping and summarization.
- **Multiple Languages Supported:** Choose from a variety of languages for summarization.
- **Dynamic State Management:** Real-time updates using React state management.

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/brown2020/scrape-and-summarize.git
   cd scrape-and-summarize
   ```

2. **Install Dependencies:**

   Make sure you have [Node.js](https://nodejs.org/) installed, then run:

   ```bash
   npm install
   ```

3. **Set Up Environment Variables:**

   Create a `.env` file in the root directory and add the following environment variables:

   ```bash
   OPENAI_API_KEY=your_openai_api_key
   ANTHROPIC_API_KEY=your_anthropic_api_key
   GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key
   MISTRAL_API_KEY=your_mistral_api_key
   FIREWORKS_API_KEY=your_fireworks_api_key
   ```

   _(Replace the placeholders with your actual API keys for the respective AI services.)_

4. **Run the Development Server:**

   ```bash
   npm run dev
   ```

   The app will be running at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Enter a Webpage URL:** Type or paste the URL of the webpage you want to scrape.
2. **Select Language and Model:** Choose a language and AI model for the summarization.
3. **Specify the Number of Words:** Input the desired word count for the summary.
4. **Generate Summary:** Click the "Scrape and Summarize" button. The summary will be displayed in real-time as it's being generated.
5. **View Results:** The results are shown in a clean and formatted way using Markdown.

## Folder Structure

```
scrape-and-summarize/
├── app/
│   ├── api/
│   │   └── proxy/
│   │       └── route.ts          # API route to handle proxy requests
│   └── page.tsx                  # Main application page
├── components/
│   ├── ScrapeSummarize.tsx       # Main React component for scraping and summarizing
│   └── ProgressBar.tsx           # Component for displaying progress during scraping and summarizing
├── lib/
│   └── generateActions.ts        # Server actions for generating summaries
├── public/                       # Public assets
├── styles/                       # Global and component-specific styles
├── .env                          # Environment variables
├── .gitignore                    # Files and directories to ignore in Git
├── README.md                     # Project documentation
└── package.json                  # Project dependencies and scripts
```

## Components

### `ScrapeSummarize.tsx`

- Main component that handles:
  - User input for the webpage URL.
  - Language and model selection.
  - Number of words for the summary.
  - Fetching, scraping, and summarizing the webpage content.
  - Displaying the real-time summary using a streaming response.

### `ProgressBar.tsx`

- A reusable component that visually represents the progress of scraping and summarization processes.
- Dynamically adjusts its width based on the progress value provided.

## API Routes

### `app/api/proxy/route.ts`

- **GET** `/api/proxy?url={URL}`
- Acts as a proxy to fetch content from external URLs to avoid CORS issues.
- Returns the raw HTML of the requested webpage.

## Technologies Used

- **Next.js 14**: React framework for server-side rendering and static site generation.
- **TypeScript**: For type safety and code clarity.
- **Cheerio**: For scraping webpage content.
- **Axios**: For making HTTP requests.
- **React Hot Toast**: For user notifications.
- **Markdown Renderer**: For displaying the summarized content.
- **OpenAI API**: For generating summaries with AI models.

## Using Vercel AI SDK

This project demonstrates how to use the **Vercel AI SDK** in a Next.js 14 application with server actions and streaming:

- **Server Actions:** The `generateSummary` function in `lib/generateActions.ts` utilizes server actions to perform asynchronous AI model calls using various SDKs provided by Vercel AI, such as OpenAI, Anthropic, Mistral, and Google's Generative AI.
- **Streaming Responses:** By using the `readStreamableValue` method from the SDK, the application streams the AI-generated summary in real-time. This allows for a responsive user experience where content is displayed progressively rather than waiting for the entire operation to complete.
- **Dynamic Model Selection:** The app allows users to select different AI models (e.g., OpenAI's GPT, Google's Gemini, Anthropic's Claude) to generate summaries, showcasing the versatility of the Vercel AI SDK to interact with multiple AI providers through a unified interface.

## Streaming Technique

To implement real-time streaming in the application, the following technique is used:

### Streaming Code Snippet

```jsx
// Stream the response to handle progressive updates
let chunkCount = 0; // Initialize chunk counter
for await (const content of readStreamableValue(result)) {
  if (content) {
    setSummary(content.trim()); // Directly update state with the latest content chunk
    chunkCount++;
    setProgress(70 + (chunkCount / numWords) * 30); // Update progress bar during summarizing
  }
}
```

### Explanation of the Streaming Technique

1. **Initialize the Stream**:

   - The function `readStreamableValue(result)` starts reading the streamed response from the AI model. This method returns an asynchronous iterator that allows for processing the streamed content as it arrives.

2. **Handle Progressive Updates**:

   - As each chunk of content (`content`) is received from the AI model, the `setSummary` function is called to update the application's state with the latest content. This ensures that the user sees the summary being generated in real-time, providing immediate feedback and a dynamic user experience.

3. **Track Progress**:

   - The `chunkCount` variable is incremented with each chunk received. The `setProgress` function is then called to update the progress bar dynamically. The formula `(70 + (chunkCount / numWords) * 30)` is used to adjust the progress bar to reflect the summarization progress from 70% to 100%, assuming that scraping accounts for the first 70% of the task.

4. **Smooth User Experience**:
   - By incrementally updating both the summary content and the progress bar, the application maintains a smooth and responsive interface that keeps the user informed of the ongoing process.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/your-feature-name`).
3. Make your changes and commit (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/your-feature-name`).
5. Create a Pull Request.

## Contact

For any questions or feedback, feel free to reach out to [info@ignitechannel.com](mailto:info@ignitechannel.com).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
