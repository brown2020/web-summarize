"use client";

import { useSummarizerStore } from "@/store/summarizerStore";
import { SummarizerForm } from "./SummarizerForm";
import { Toaster } from "react-hot-toast";
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

function SummaryContent({ summary }: { summary: string }) {
  const paragraphs = useMemo(
    () => summary.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean),
    [summary]
  );

  if (!paragraphs.length) {
    return <p className="whitespace-pre-wrap leading-7">{summary}</p>;
  }

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 16)}`} className="leading-7">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function ProgressCard({ onCancel }: { onCancel: () => void }) {
  const isPending = useSummarizerStore((state) => state.isPending);
  const progress = useSummarizerStore((state) => state.progress);

  const progressLabel = useMemo(() => {
    if (!isPending) return "";
    if (progress < PROGRESS_STEPS.URL_FETCHED) return "Starting...";
    if (progress < PROGRESS_STEPS.CONTENT_EXTRACTED) return "Fetching webpage...";
    if (progress < PROGRESS_STEPS.AI_PROCESSING) return "Extracting readable text...";
    if (progress < PROGRESS_STEPS.COMPLETE) return "Generating summary...";
    return "Finalizing...";
  }, [isPending, progress]);

  if (!isPending) {
    return null;
  }

  return (
    <Card className="border-none bg-transparent shadow-none">
      <CardContent className="space-y-2 pt-6">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{progressLabel}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="w-full" />
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onCancel}>
            Stop streaming
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ onRetry }: { onRetry: () => Promise<void> }) {
  const error = useSummarizerStore((state) => state.error);
  const isPending = useSummarizerStore((state) => state.isPending);
  const url = useSummarizerStore((state) => state.url);

  if (!error || isPending) {
    return null;
  }

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardContent className="space-y-3 pt-6">
        <p className="text-destructive">{error}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void onRetry()}>Retry</Button>
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
  );
}

function SummaryCard({
  onRegenerate,
  onSummarizeText,
}: {
  onRegenerate: () => Promise<void>;
  onSummarizeText: (document: string) => Promise<void>;
}) {
  const summary = useSummarizerStore((state) => state.summary);
  const url = useSummarizerStore((state) => state.url);
  const extractedText = useSummarizerStore((state) => state.extractedText);
  const isPending = useSummarizerStore((state) => state.isPending);
  const language = useSummarizerStore((state) => state.language);
  const modelName = useSummarizerStore((state) => state.modelName);
  const numWords = useSummarizerStore((state) => state.numWords);
  const [editedText, setEditedText] = useState(extractedText);
  const [prevExtractedText, setPrevExtractedText] = useState(extractedText);
  if (prevExtractedText !== extractedText) {
    setPrevExtractedText(extractedText);
    setEditedText(extractedText);
  }

  const canEditExtractedText = Boolean(extractedText);

  if (!summary) {
    return null;
  }

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
    const safeHost = (() => {
      try {
        return new URL(url).hostname.replace(/\./g, "-");
      } catch {
        return "web";
      }
    })();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `summary-${safeHost}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
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
            <Button onClick={() => void onRegenerate()}>Regenerate</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-none text-sm">
          <SummaryContent summary={summary} />
        </div>

        {canEditExtractedText ? (
          <details className="rounded-md border bg-background p-4">
            <summary className="cursor-pointer select-none text-sm font-medium">
              Edit extracted text (advanced)
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                If the webpage extraction included nav/ads or missed content,
                tweak it here and regenerate.
              </p>
              <textarea
                value={editedText}
                onChange={(event) => setEditedText(event.target.value)}
                className="min-h-[220px] w-full rounded-md border border-input bg-background p-3 text-sm leading-5"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void onSummarizeText(editedText)}
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
  );
}

export default function ScrapeSummarize({ modelOptions }: ScrapeSummarizeProps) {
  const modelName = useSummarizerStore((state) => state.modelName);
  const setUrl = useSummarizerStore((state) => state.setUrl);
  const setLanguage = useSummarizerStore((state) => state.setLanguage);
  const setModelName = useSummarizerStore((state) => state.setModelName);
  const setNumWords = useSummarizerStore((state) => state.setNumWords);

  const { scrapeAndSummarize, summarizeText, cancel } = useSummarizer();

  useEffect(() => {
    if (!modelOptions.length) return;
    const hasModel = modelOptions.some((model) => model.value === modelName);
    if (!hasModel) {
      setModelName(modelOptions[0].value);
    }
  }, [modelName, modelOptions, setModelName]);

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
    if (typeof nextModel === "string" && nextModel.length > 0) {
      setModelName(nextModel);
    }
    if (nextWords) {
      const parsedWords = Number(nextWords);
      if (Number.isFinite(parsedWords)) {
        setNumWords(
          clampNumber(
            Math.floor(parsedWords),
            VALIDATION.MIN_WORDS,
            VALIDATION.MAX_WORDS
          )
        );
      }
    }
  }, [setLanguage, setModelName, setNumWords, setUrl]);

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

      <ProgressCard onCancel={cancel} />
      <ErrorCard onRetry={scrapeAndSummarize} />
      <SummaryCard
        onRegenerate={scrapeAndSummarize}
        onSummarizeText={summarizeText}
      />
    </div>
  );
}
