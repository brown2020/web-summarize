import { useSummarizerStore } from "@/store/summarizerStore";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { toast } from "react-hot-toast";
import axios from "axios";
import { PROGRESS_STEPS } from "@/constants/app";

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.error ||
      "Network error. Please check your connection."
    );
  }
  return error instanceof Error ? error.message : fallback;
}

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

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setSummary("");
    setProgress(PROGRESS_STEPS.INITIAL);
    setError(null);

    try {
      if (!url.trim()) throw new Error("URL is required");

      // 1. Fetch and extract text via proxy (server-side extraction)
      const response = await axios.get(
        `/api/proxy?url=${encodeURIComponent(url)}`
      );
      const { text } = response.data;
      setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);

      // 2. Generate summary via server action
      setProgress(PROGRESS_STEPS.AI_PROCESSING);
      const result = await generateSummary(text, language, modelName, numWords);

      // 3. Stream the response
      let accumulatedContent = "";
      const expectedChars = numWords * 5; // ~5 chars per word heuristic

      for await (const content of readStreamableValue(result)) {
        if (content) {
          accumulatedContent = content.trim();
          setSummary(accumulatedContent);

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
      const message = getErrorMessage(err, "Failed to generate summary");
      setError(message);
      toast.error(message);
      setProgress(PROGRESS_STEPS.INITIAL);
    } finally {
      setIsPending(false);
    }
  };

  return { handleScrapeAndSummarize };
}
