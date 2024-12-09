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

  const handleScrapeAndSummarize = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setSummary("");
    setProgress(0);

    try {
      setProgress(20);
      const response = await axios.get(
        `/api/proxy?url=${encodeURIComponent(url)}`
      );
      setProgress(50);

      const html = response.data;
      const $ = load(html);
      const text = $("body").text().replace(/\s+/g, " ").trim();
      setProgress(70);

      const result = await generateSummary(text, language, modelName, numWords);

      let chunkCount = 0;
      for await (const content of readStreamableValue(result)) {
        if (content) {
          setSummary(content.trim());
          chunkCount++;
          setProgress(70 + (chunkCount / numWords) * 30);
        }
      }

      toast.success("Summary generated successfully");
    } catch (err) {
      console.error("Error generating summary:", err);
      toast.error("Failed to generate summary");
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
    handleScrapeAndSummarize,
  };
}
