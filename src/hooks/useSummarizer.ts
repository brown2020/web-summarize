import { useSummarizerStore } from "@/store/summarizerStore";
import { generateSummary } from "@/actions/generateActions";
import { readStreamableValue } from "@ai-sdk/rsc";
import { toast } from "react-hot-toast";
import { PROGRESS_STEPS, VALIDATION } from "@/constants/app";
import { useCallback, useRef } from "react";
import type { Language } from "@/types/summarizer";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Request cancelled.";
  }
  return error instanceof Error ? error.message : fallback;
}

export function useSummarizer() {
  const setExtractedText = useSummarizerStore((state) => state.setExtractedText);
  const setSummary = useSummarizerStore((state) => state.setSummary);
  const setIsPending = useSummarizerStore((state) => state.setIsPending);
  const setProgress = useSummarizerStore((state) => state.setProgress);
  const setError = useSummarizerStore((state) => state.setError);

  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsPending(false);
    setProgress(PROGRESS_STEPS.INITIAL);
    toast("Stopped streaming locally");
  }, [setIsPending, setProgress]);

  const normalizeDocument = useCallback((document: string) => {
    if (document.length <= VALIDATION.MAX_DOCUMENT_CHARS) return document;
    toast(
      `Content was long and has been truncated to ${VALIDATION.MAX_DOCUMENT_CHARS.toLocaleString()} characters.`
    );
    return document.slice(0, VALIDATION.MAX_DOCUMENT_CHARS);
  }, []);

  const fetchExtractedText = useCallback(
    async (url: string, signal: AbortSignal) => {
      const response = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`, {
        signal,
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; text?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to fetch webpage content.");
      }

      if (typeof payload?.text !== "string") {
        throw new Error("Failed to extract readable text from the webpage.");
      }

      return payload.text;
    },
    []
  );

  const streamSummary = useCallback(
    async (
      document: string,
      runId: number,
      controller: AbortController,
      language: Language,
      modelName: string,
      numWords: number
    ) => {
      try {
        const normalizedDocument = normalizeDocument(document);
        if (!normalizedDocument.trim()) throw new Error("No content to summarize.");

        setProgress(PROGRESS_STEPS.AI_PROCESSING);
        const result = await generateSummary(
          normalizedDocument,
          language,
          modelName,
          numWords
        );

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
          return;
        }

        setProgress(PROGRESS_STEPS.COMPLETE);
        toast.success("Summary generated successfully");
      } catch (err) {
        const message = getErrorMessage(err, "Failed to generate summary");
        if (message === "Request cancelled.") {
          return;
        }

        setError(message);
        toast.error(message);
        setProgress(PROGRESS_STEPS.INITIAL);
      }
    },
    [normalizeDocument, setError, setProgress, setSummary]
  );

  const summarizeText = useCallback(async (document: string) => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const { language, modelName, numWords } = useSummarizerStore.getState();

    const normalizedDocument = normalizeDocument(document);

    setIsPending(true);
    setSummary("");
    setExtractedText(normalizedDocument);
    setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);
    setError(null);

    try {
      await streamSummary(
        normalizedDocument,
        runId,
        controller,
        language,
        modelName,
        numWords
      );
    } finally {
      setIsPending(false);
      abortRef.current = null;
    }
  }, [
    normalizeDocument,
    setError,
    setExtractedText,
    setIsPending,
    setProgress,
    setSummary,
    streamSummary,
  ]);

  const scrapeAndSummarize = useCallback(async () => {
    const runId = ++runIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    const { url, language, modelName, numWords } = useSummarizerStore.getState();

    setIsPending(true);
    setSummary("");
    setExtractedText("");
    setProgress(PROGRESS_STEPS.INITIAL);
    setError(null);

    try {
      if (!url.trim()) throw new Error("URL is required");

      setProgress(PROGRESS_STEPS.URL_FETCHED);

      const text = await fetchExtractedText(url, controller.signal);

      if (controller.signal.aborted || runId !== runIdRef.current) {
        return;
      }

      const normalizedText = normalizeDocument(text);
      setExtractedText(normalizedText);
      setProgress(PROGRESS_STEPS.CONTENT_EXTRACTED);

      await streamSummary(
        normalizedText,
        runId,
        controller,
        language,
        modelName,
        numWords
      );
    } catch (err) {
      const message = getErrorMessage(err, "Failed to generate summary");
      if (message === "Request cancelled.") {
        return;
      } else {
        setError(message);
        toast.error(message);
      }
      setProgress(PROGRESS_STEPS.INITIAL);
    } finally {
      setIsPending(false);
      abortRef.current = null;
    }
  }, [
    fetchExtractedText,
    normalizeDocument,
    setError,
    setExtractedText,
    setIsPending,
    setProgress,
    setSummary,
    streamSummary,
  ]);

  return { scrapeAndSummarize, summarizeText, cancel };
}
