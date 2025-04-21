import { useState } from "react";
import axios from "axios";
import { load } from "cheerio";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "ai/rsc";
import { toast } from "react-hot-toast";
import { Language } from "@/types/summarizer";

export function useSummarizer() {
  const [url, setUrl] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [modelName, setModelName] = useState<string>("gpt-4o");
  const [numWords, setNumWords] = useState<number>(100);
  const [summary, setSummary] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setSummary("");
    setProgress(0);
    setError(null);

    try {
      setProgress(20);

      // Make the proxy API call and handle errors without throwing
      let response;
      try {
        response = await axios.get(`/api/proxy?url=${encodeURIComponent(url)}`);
      } catch (error) {
        // Handle axios errors without throwing
        if (axios.isAxiosError(error) && error.response) {
          const errorMsg =
            error.response.data?.error ||
            "Failed to fetch webpage. Please check the URL and try again.";
          setError(errorMsg);
          return; // Exit early instead of throwing
        } else {
          const networkError =
            "Network error. Please check your connection and try again.";
          setError(networkError);
          return; // Exit early instead of throwing
        }
      }

      setProgress(50);

      const html = response.data;
      const $ = load(html);
      const text = $("body").text().replace(/\s+/g, " ").trim();

      if (!text || text.trim().length === 0) {
        const noContentError =
          "No content found on the webpage. Please try a different URL.";
        setError(noContentError);
        return; // Exit early instead of throwing
      }

      setProgress(70);

      try {
        const result = await generateSummary(
          text,
          language,
          modelName,
          numWords
        );

        let chunkCount = 0;
        for await (const content of readStreamableValue(result)) {
          if (content) {
            setSummary(content.trim());
            chunkCount++;
            setProgress(70 + (chunkCount / numWords) * 30);
          }
        }

        // Keep success toast since it's not redundant with any UI element
        toast.success("Summary generated successfully");
      } catch (err) {
        // Handle AI generation errors
        const aiError =
          err instanceof Error
            ? err.message
            : "Failed to generate summary. Please try again.";

        setError(aiError);
      }
    } catch (err) {
      // This catch block should rarely be triggered now
      const fallbackError =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";

      setError(fallbackError);
    } finally {
      setIsPending(false);
      setProgress(100);
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
