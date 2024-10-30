"use client";

import { useState } from "react";
import axios from "axios";
import { load } from "cheerio"; // Corrected import for cheerio
import { generateSummary } from "@/actions/generateActions"; // Import the server action
import { readStreamableValue } from "ai/rsc";
import { toast } from "react-hot-toast"; // Import react-hot-toast
import Markdown from "react-markdown";
import ProgressBar from "@/components/ProgressBar"; // Import the ProgressBar component

type Language =
  | "english"
  | "french"
  | "spanish"
  | "german"
  | "italian"
  | "portuguese"
  | "chinese"
  | "russian"
  | "hindi"
  | "japanese";

const languages: Language[] = [
  "english",
  "french",
  "spanish",
  "german",
  "italian",
  "portuguese",
  "chinese",
  "russian",
  "hindi",
  "japanese",
];

export const modelOptions = [
  { value: "gpt-4o", label: "GPT 4 Omni" },

  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },

  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },

  {
    value: "llama-v3p1-405b",
    label: "Llama 3.1 405B Instruct",
  },

  {
    value: "mistral-large",
    label: "Mistral Large",
  },

  {
    value: "xai-grok",
    label: "xAI Grok Beta",
  },
];

export default function ScrapeSummarize() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [modelName, setModelName] = useState<string>("gpt-4o");
  const [numWords, setNumWords] = useState<number>(100); // New state for number of words
  const [summary, setSummary] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<number>(0); // State for progress bar

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setSummary(""); // Clear previous summary
    setProgress(0); // Reset progress bar

    try {
      // Simulate the progress for scraping (50% of total progress)
      setProgress(20); // Start scraping
      const response = await axios.get(
        `/api/proxy?url=${encodeURIComponent(url)}`
      );
      setProgress(50); // Halfway done with scraping

      // Process the scraped content
      const html = response.data;
      const $ = load(html); // Corrected usage of cheerio
      const text = $("body").text().replace(/\s+/g, " ").trim();
      setProgress(70); // Completed scraping, moving to summarizing

      // Use the server action to generate the summary with the specified number of words
      const result = await generateSummary(text, language, modelName, numWords);

      // Stream the response to handle progressive updates
      let chunkCount = 0; // Initialize chunk counter
      for await (const content of readStreamableValue(result)) {
        if (content) {
          setSummary(content.trim()); // Directly update state with the latest content chunk
          chunkCount++;
          setProgress(70 + (chunkCount / numWords) * 30); // Update progress bar during summarizing
        }
      }

      toast.success("Summary generated successfully");
    } catch (err) {
      console.error("Error generating summary:", err);
      toast.error("Failed to generate summary");
    } finally {
      setIsPending(false);
      setProgress(100); // Set progress to 100% once completed
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scrape and Summarize Webpage</h1>
      <form className="flex flex-col gap-4" onSubmit={handleScrapeAndSummarize}>
        <div>
          <label>
            Webpage URL:
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter a webpage URL"
              className="w-full p-2 border rounded"
            />
          </label>
        </div>

        <div>
          <label>
            Select Language:
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full p-2 border rounded"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            Select Model:
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full p-2 border rounded"
            >
              {modelOptions.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <label>
            Number of Words:
            <input
              type="number"
              value={numWords}
              onChange={(e) => setNumWords(Number(e.target.value))}
              placeholder="Enter number of words"
              className="w-full p-2 border rounded"
              min={10} // Set a minimum value to avoid too short summaries
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="p-2 bg-blue-500 text-white rounded"
        >
          {isPending ? "Summarizing..." : "Scrape and Summarize"}
        </button>
      </form>

      {/* Use the ProgressBar component */}
      {isPending && <ProgressBar progress={progress} />}

      {summary && (
        <div className="mt-4 p-5 bg-gray-100 rounded-md">
          <Markdown>{summary}</Markdown>
        </div>
      )}
    </div>
  );
}
