import { useState } from "react";
import axios from "axios";
import { load } from "cheerio";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "ai/rsc";
import { toast } from "react-hot-toast";
import { Language } from "@/types/summarizer";
import { PROGRESS_STEPS, VALIDATION } from "@/constants/app";

interface SummarizerError {
  message: string;
  type: 'network' | 'content' | 'ai' | 'validation' | 'unknown';
}

export function useSummarizer() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [modelName, setModelName] = useState<string>("gpt-4o");
  const [numWords, setNumWords] = useState<number>(VALIDATION.DEFAULT_WORDS);
  const [summary, setSummary] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<number>(PROGRESS_STEPS.INITIAL);
  const [error, setError] = useState<string | null>(null);

  const handleError = (error: unknown, fallbackMessage: string): SummarizerError => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return {
          message: error.response.data?.error || `Server error: ${error.response.status}`,
          type: 'network'
        };
      }
      return {
        message: "Network error. Please check your connection and try again.",
        type: 'network'
      };
    }
    
    if (error instanceof Error) {
      return {
        message: error.message,
        type: 'unknown'
      };
    }
    
    return {
      message: fallbackMessage,
      type: 'unknown'
    };
  };

  const fetchWebpageContent = async (url: string): Promise<string> => {
    setProgress(PROGRESS_STEPS.INITIAL);
    
    try {
      const response = await axios.get(`/api/proxy?url=${encodeURIComponent(url)}`);
      setProgress(PROGRESS_STEPS.URL_FETCHED);
      return response.data;
    } catch (error) {
      const handledError = handleError(error, "Failed to fetch webpage");
      throw new Error(handledError.message);
    }
  };

  const extractTextContent = (html: string): string => {
    const $ = load(html);
    const text = $("body").text().replace(/\s+/g, " ").trim();
    
    if (!text || text.trim().length === 0) {
      throw new Error("No content found on the webpage. Please try a different URL.");
    }
    
    setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);
    return text;
  };

  const generateAISummary = async (
    text: string, 
    language: Language, 
    modelName: string, 
    numWords: number
  ): Promise<void> => {
    setProgress(PROGRESS_STEPS.AI_PROCESSING);
    
    try {
      const result = await generateSummary(text, language, modelName, numWords);
      let accumulatedContent = "";

      for await (const content of readStreamableValue(result)) {
        if (content) {
          accumulatedContent = content.trim();
          setSummary(accumulatedContent);
          
          // More accurate progress calculation based on content length
          const progressIncrement = Math.min(
            (accumulatedContent.length / (numWords * 5)) * 30, // Estimate 5 chars per word
            30
          );
          setProgress(PROGRESS_STEPS.AI_PROCESSING + progressIncrement);
        }
      }

      setProgress(PROGRESS_STEPS.COMPLETE);
      toast.success("Summary generated successfully");
    } catch (error) {
      const handledError = handleError(error, "Failed to generate summary");
      throw new Error(handledError.message);
    }
  };

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset state
    setIsPending(true);
    setSummary("");
    setProgress(PROGRESS_STEPS.INITIAL);
    setError(null);

    try {
      // Validate inputs
      if (!url.trim()) {
        throw new Error("URL is required");
      }
      
      if (numWords < VALIDATION.MIN_WORDS || numWords > VALIDATION.MAX_WORDS) {
        throw new Error(`Number of words must be between ${VALIDATION.MIN_WORDS} and ${VALIDATION.MAX_WORDS}`);
      }

      // Fetch and process webpage
      const html = await fetchWebpageContent(url);
      const text = extractTextContent(html);
      
      // Generate AI summary
      await generateAISummary(text, language, modelName, numWords);
      
    } catch (err) {
      const handledError = handleError(err, "An unexpected error occurred");
      setError(handledError.message);
      setProgress(PROGRESS_STEPS.INITIAL);
    } finally {
      setIsPending(false);
    }
  };

  return {
    url,
    setUrl,
    language,
    setLanguage,
    modelName,
    setModelName,
    numWords,
    setNumWords,
    summary,
    isPending,
    progress,
    error,
    handleScrapeAndSummarize,
  };
}
