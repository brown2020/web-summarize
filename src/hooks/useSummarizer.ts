import { useSummarizerStore } from "@/store/summarizerStore";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { toast } from "react-hot-toast";
import axios from "axios";
import { PROGRESS_STEPS } from "@/constants/app";

export function useSummarizer() {
  const {
    url,
    language,
    modelName,
    numWords,
    setSummary,
    setIsPending,
    setProgress,
    setError,
  } = useSummarizerStore();

  const handleError = (error: unknown, fallbackMessage: string) => {
    if (axios.isAxiosError(error)) {
      return (
        error.response?.data?.error ||
        "Network error. Please check your connection."
      );
    }
    return error instanceof Error ? error.message : fallbackMessage;
  };

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setSummary("");
    setProgress(PROGRESS_STEPS.INITIAL);
    setError(null);

    try {
      if (!url.trim()) throw new Error("URL is required");

      // 1. Fetch Content via Proxy
      // We use a proxy to avoid CORS issues when fetching external HTML
      const response = await axios.get(
        `/api/proxy?url=${encodeURIComponent(url)}`
      );
      const html = response.data;
      setProgress(PROGRESS_STEPS.URL_FETCHED);

      // 2. Extract Text
      // Simple client-side extraction. For production, consider moving this to the server/proxy
      // to ensure consistent parsing and reduce client bundle size (cheerio is heavy).
      // For this refactor, we'll stick to a lightweight DOM parser approach or assume the proxy returns text.
      // If the proxy returns raw HTML:
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      
      // Remove scripts, styles, and other non-content elements
      const scripts = doc.querySelectorAll('script, style, noscript, iframe, svg');
      scripts.forEach(script => script.remove());
      
      const text = doc.body.innerText.replace(/\s+/g, " ").trim();

      if (!text || text.length < 50) {
        throw new Error("Content too short or could not be extracted.");
      }
      setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);

      // 3. Generate Summary via Server Action
      setProgress(PROGRESS_STEPS.AI_PROCESSING);
      const result = await generateSummary(text, language, modelName, numWords);

      let accumulatedContent = "";
      for await (const content of readStreamableValue(result)) {
        if (content) {
          accumulatedContent = content.trim();
          setSummary(accumulatedContent);

          // Estimate progress based on expected length
          // heuristic: 5 chars per word
          const expectedChars = numWords * 5;
          const progressIncrement = Math.min(
            (accumulatedContent.length / expectedChars) * 30,
            30
          );
          setProgress(PROGRESS_STEPS.AI_PROCESSING + progressIncrement);
        }
      }

      setProgress(PROGRESS_STEPS.COMPLETE);
      toast.success("Summary generated successfully");
    } catch (err) {
      const message = handleError(err, "Failed to generate summary");
      setError(message);
      toast.error(message);
      setProgress(PROGRESS_STEPS.INITIAL);
    } finally {
      setIsPending(false);
    }
  };

  return {
    handleScrapeAndSummarize,
  };
}
