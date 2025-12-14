import { useSummarizerStore } from "@/store/summarizerStore";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { toast } from "react-hot-toast";
import axios from "axios";
import { PROGRESS_STEPS } from "@/constants/app";
import { useRef } from "react";

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
    return "Request cancelled.";
  }
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
    setExtractedText,
    setSummary,
    setIsPending,
    setProgress,
    setError,
  } = useSummarizerStore();

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const streamSummary = async (
    document: string,
    runId: number,
    controller: AbortController
  ) => {
    try {
      if (!document.trim()) throw new Error("No content to summarize.");

      // Generate summary via server action
      setProgress(PROGRESS_STEPS.AI_PROCESSING);
      const result = await generateSummary(
        document,
        language,
        modelName,
        numWords
      );

      // 3. Stream the response
      let accumulatedContent = "";
      const expectedChars = numWords * 5; // ~5 chars per word heuristic

      for await (const content of readStreamableValue(result)) {
        if (controller.signal.aborted || runId !== runIdRef.current) break;
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

      if (controller.signal.aborted || runId !== runIdRef.current) {
        toast("Cancelled");
        setProgress(PROGRESS_STEPS.INITIAL);
        return;
      }

      setProgress(PROGRESS_STEPS.COMPLETE);
      toast.success("Summary generated successfully");
    } catch (err) {
      const message = getErrorMessage(err, "Failed to generate summary");
      if (message === "Request cancelled.") {
        toast("Cancelled");
      } else {
        setError(message);
        toast.error(message);
      }
      setProgress(PROGRESS_STEPS.INITIAL);
    }
  };

  const summarizeText = async (document: string) => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setIsPending(true);
    setSummary("");
    setExtractedText(document);
    setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);
    setError(null);

    try {
      await streamSummary(document, runId, controller);
    } finally {
      setIsPending(false);
      abortRef.current = null;
    }
  };

  const scrapeAndSummarize = async () => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    setIsPending(true);
    setSummary("");
    setExtractedText("");
    setProgress(PROGRESS_STEPS.INITIAL);
    setError(null);

    try {
      if (!url.trim()) throw new Error("URL is required");

      setProgress(PROGRESS_STEPS.URL_FETCHED);

      // 1. Fetch and extract text via proxy (server-side extraction)
      const response = await axios.get(
        `/api/proxy?url=${encodeURIComponent(url)}`,
        { signal: controller.signal }
      );

      if (controller.signal.aborted || runId !== runIdRef.current) {
        toast("Cancelled");
        setProgress(PROGRESS_STEPS.INITIAL);
        return;
      }

      const { text } = response.data as { text: string };
      setExtractedText(text);
      setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);

      // 2. Generate summary via server action (streamed)
      await streamSummary(text, runId, controller);
    } catch (err) {
      const message = getErrorMessage(err, "Failed to generate summary");
      if (message === "Request cancelled.") {
        toast("Cancelled");
      } else {
        setError(message);
        toast.error(message);
      }
      setProgress(PROGRESS_STEPS.INITIAL);
    } finally {
      setIsPending(false);
      abortRef.current = null;
    }
  };

  return { scrapeAndSummarize, summarizeText, cancel };
}
