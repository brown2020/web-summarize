# Scrape and Summarize Webpage

A Next.js 14 application that scrapes a webpage, processes the content, and generates a concise summary using AI. This project utilizes server actions, streaming responses, and dynamic state management to provide real-time content summarization.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Folder Structure](#folder-structure)
- [Components](#components)
- [API Routes](#api-routes)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [Contact](#contact)
- [License](#license)

## Features

- **Scrape Webpages:** Enter a URL to fetch and scrape content from the specified webpage.
- **AI-Powered Summarization:** Leverage AI models to generate a summary in the desired language.
- **Real-Time Streaming:** Display the summary in real-time as it's being generated.
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
   FIREWORKS_API_KEY=your_api_key_here
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

   _(Replace `your_api_key_here` with your actual API key for the AI service.)_

4. **Run the Development Server:**

   ```bash
   npm run dev
   ```

   The app will be running at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Enter a Webpage URL:** Type or paste the URL of the webpage you want to scrape.
2. **Select Language and Model:** Choose a language and AI model for the summarization.
3. **Generate Summary:** Click the "Scrape and Summarize" button. The summary will be displayed in real-time as it's being generated.
4. **View Results:** The results are shown in a clean and formatted way using Markdown.

## Folder Structure

```
scrape-and-summarize/
├── app/
│   ├── api/
│   │   └── proxy/
│   │       └── route.ts          # API route to handle proxy requests
│   └── page.tsx                  # Main application page
├── components/
│   └── ScrapeSummarize.tsx       # Main React component for scraping and summarizing
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
  - Fetching, scraping, and summarizing the webpage content.
  - Displaying the real-time summary using a streaming response.

### `ProgressBar.tsx`

- Optional component to show progress during the summarization process.

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
