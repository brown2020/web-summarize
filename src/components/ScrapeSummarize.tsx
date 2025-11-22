"use client";

import { useSummarizerStore } from "@/store/summarizerStore";
import { SummarizerForm } from "./SummarizerForm";
import { Toaster } from "react-hot-toast";
import Markdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSummarizer } from "@/hooks/useSummarizer";

export default function ScrapeSummarize() {
  const {
    summary,
    isPending,
    progress,
    error,
  } = useSummarizerStore();

  const { handleScrapeAndSummarize } = useSummarizer();

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
          <SummarizerForm onSubmit={handleScrapeAndSummarize} />
        </CardContent>
      </Card>

      {isPending && (
        <Card className="border-none shadow-none bg-transparent">
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Processing...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </CardContent>
        </Card>
      )}

      {error && !isPending && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6 text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {summary && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none">
            <Markdown>{summary}</Markdown>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
