"use client";

import { useSummarizerStore } from "@/store/summarizerStore";
import { SummarizerForm } from "./SummarizerForm";
import { Toaster } from "react-hot-toast";
import Markdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSummarizer } from "@/hooks/useSummarizer";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { PROGRESS_STEPS, VALIDATION } from "@/constants/app";
import { useEffect, useMemo, useState } from "react";
import { LanguageSchema } from "@/types/summarizer";
import { clampNumber } from "@/lib/utils";
import type { ModelOption } from "@/types/summarizer";

type ScrapeSummarizeProps = {
  modelOptions: ModelOption[];
};

export default function ScrapeSummarize({ modelOptions }: ScrapeSummarizeProps) {
  const {
    url,
    language,
    modelName,
    numWords,
    summary,
    extractedText,
    isPending,
    progress,
    error,
    setUrl,
    setLanguage,
    setModelName,
    setNumWords,
  } = useSummarizerStore();

  const { scrapeAndSummarize, summarizeText, cancel } = useSummarizer();

  const [editedText, setEditedText] = useState("");

  useEffect(() => {
    setEditedText(extractedText);
  }, [extractedText]);

  useEffect(() => {
    if (!modelOptions.length) return;
    const hasModel = modelOptions.some((model) => model.value === modelName);
    if (!hasModel) {
      setModelName(modelOptions[0].value);
    }
  }, [modelName, modelOptions, setModelName]);

  // Lightweight deep-linking so "Share link" is meaningful.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextUrl = params.get("url");
    const nextLanguage = params.get("lang");
    const nextModel = params.get("model");
    const nextWords = params.get("words");

    if (nextUrl) setUrl(nextUrl);
    if (nextLanguage) {
      const parsedLanguage = LanguageSchema.safeParse(nextLanguage);
      if (parsedLanguage.success) setLanguage(parsedLanguage.data);
    }
    if (typeof nextModel === "string" && nextModel.length > 0)
      setModelName(nextModel);
    if (nextWords) {
      const n = Number(nextWords);
      if (Number.isFinite(n)) {
        setNumWords(
          clampNumber(
            Math.floor(n),
            VALIDATION.MIN_WORDS,
            VALIDATION.MAX_WORDS
          )
        );
      }
    }
  }, [setLanguage, setModelName, setNumWords, setUrl]);

  const progressLabel = useMemo(() => {
    if (!isPending) return "";
    if (progress < PROGRESS_STEPS.URL_FETCHED) return "Starting…";
    if (progress < PROGRESS_STEPS.CONTENT_EXTRACTED) return "Fetching webpage…";
    if (progress < PROGRESS_STEPS.AI_PROCESSING)
      return "Extracting readable text…";
    if (progress < PROGRESS_STEPS.COMPLETE) return "Generating summary…";
    return "Finalizing…";
  }, [isPending, progress]);

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("Copied summary");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownloadMarkdown = () => {
    const markdown = summary.trim() ? `${summary.trim()}\n` : "";
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    const safeHost = (() => {
      try {
        return new URL(url).hostname.replace(/\./g, "-");
      } catch {
        return "web";
      }
    })();
    a.href = URL.createObjectURL(blob);
    a.download = `summary-${safeHost}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  };

  const handleShareLink = async () => {
    const shareUrl =
      `${window.location.origin}${window.location.pathname}?` +
      new URLSearchParams({
        url,
        lang: language,
        model: modelName,
        words: String(numWords),
      }).toString();

    try {
      if ("share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ title: "Web Summarizer", url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Copied share link");
    } catch {
      toast.error("Failed to share");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4 space-y-8">
      <Toaster position="top-center" />

      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Web Summarizer
        </h1>
        <p className="text-muted-foreground">
          Enter a URL to generate a concise AI summary using advanced LLMs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <SummarizerForm onSubmit={scrapeAndSummarize} modelOptions={modelOptions} />
        </CardContent>
      </Card>

      {isPending && (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progressLabel}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && !isPending && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 space-y-3">
            <p className="text-destructive">{error}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void scrapeAndSummarize()}>Retry</Button>
              {url ? (
                <Button variant="outline" asChild>
                  <a href={url} target="_blank" rel="noreferrer">
                    Open source
                  </a>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="bg-muted/50">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Summary</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={handleCopySummary}>
                  Copy
                </Button>
                <Button variant="outline" onClick={handleDownloadMarkdown}>
                  Download
                </Button>
                <Button variant="outline" onClick={handleShareLink}>
                  Share link
                </Button>
                {url ? (
                  <Button variant="outline" asChild>
                    <a href={url} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  </Button>
                ) : null}
                <Button onClick={() => void scrapeAndSummarize()}>
                  Regenerate
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="prose dark:prose-invert max-w-none">
              <Markdown>{summary}</Markdown>
            </div>

            {extractedText ? (
              <details className="rounded-md border bg-background p-4">
                <summary className="cursor-pointer select-none text-sm font-medium">
                  Edit extracted text (advanced)
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    If the webpage extraction included nav/ads or missed
                    content, tweak it here and regenerate.
                  </p>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[220px] w-full rounded-md border border-input bg-background p-3 text-sm leading-5"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => void summarizeText(editedText)}
                      disabled={isPending || editedText.trim().length === 0}
                    >
                      Regenerate from edited text
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditedText(extractedText)}
                      disabled={isPending}
                    >
                      Reset edits
                    </Button>
                  </div>
                </div>
              </details>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
