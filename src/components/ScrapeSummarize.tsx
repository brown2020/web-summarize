"use client";

import { useSummarizer } from "@/hooks/useSummarizer";
import ProgressBar from "./ProgressBar";
import Markdown from "react-markdown";
import { SummarizerForm } from "./SummarizerForm";

export default function ScrapeSummarize() {
  const {
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
    handleScrapeAndSummarize,
  } = useSummarizer();

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Scrape and Summarize Webpage</h1>

      <SummarizerForm
        url={url}
        setUrl={setUrl}
        language={language}
        setLanguage={setLanguage}
        modelName={modelName}
        setModelName={setModelName}
        numWords={numWords}
        setNumWords={setNumWords}
        isPending={isPending}
        onSubmit={handleScrapeAndSummarize}
      />

      {isPending && <ProgressBar progress={progress} />}

      {summary && (
        <div className="mt-4 p-5 bg-gray-100 rounded-md">
          <Markdown>{summary}</Markdown>
        </div>
      )}
    </div>
  );
}
