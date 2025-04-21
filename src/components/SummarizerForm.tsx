import { Language } from "@/types/summarizer";
import { LANGUAGES, MODEL_OPTIONS } from "@/constants/summarizer";
import { useState } from "react";

type SummarizerFormProps = {
  url: string;
  setUrl: (url: string) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  modelName: string;
  setModelName: (modelName: string) => void;
  numWords: number;
  setNumWords: (numWords: number) => void;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function SummarizerForm({
  url,
  setUrl,
  language,
  setLanguage,
  modelName,
  setModelName,
  numWords,
  setNumWords,
  isPending,
  onSubmit,
}: SummarizerFormProps) {
  const [urlError, setUrlError] = useState<string>("");

  const validateUrl = (value: string) => {
    setUrl(value);

    if (!value) {
      setUrlError("URL is required");
      return;
    }

    try {
      // Try parsing as a URL
      new URL(value);
      setUrlError("");
    } catch {
      // Check if it might be valid with https:// prefix
      try {
        new URL(`https://${value}`);
        setUrlError("");
      } catch {
        setUrlError("Please enter a valid URL (e.g., https://example.com)");
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submission
    try {
      new URL(url);
    } catch {
      // Try with https:// prefix
      try {
        const prefixedUrl = `https://${url}`;
        new URL(prefixedUrl);
        setUrl(prefixedUrl);
      } catch {
        setUrlError("Please enter a valid URL (e.g., https://example.com)");
        return;
      }
    }

    onSubmit(e);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <label>
          Webpage URL:
          <input
            type="text"
            value={url}
            onChange={(e) => validateUrl(e.target.value)}
            placeholder="Enter a webpage URL (e.g., https://example.com)"
            className={`w-full p-2 border rounded-sm ${
              urlError ? "border-red-500" : ""
            }`}
          />
        </label>
        {urlError && <p className="text-red-500 text-sm mt-1">{urlError}</p>}
      </div>

      <div>
        <label>
          Select Language:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full p-2 border rounded-sm"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang.charAt(0).toUpperCase() + lang.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          Select Model:
          <select
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            className="w-full p-2 border rounded-sm"
          >
            {MODEL_OPTIONS.map((model) => (
              <option key={model.value} value={model.value}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <label>
          Number of Words:
          <input
            type="number"
            value={numWords}
            onChange={(e) => setNumWords(Number(e.target.value))}
            placeholder="Enter number of words"
            className="w-full p-2 border rounded-sm"
            min={10}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending || !!urlError}
        className={`p-2 ${
          isPending || !!urlError ? "bg-gray-400" : "bg-blue-500"
        } text-white rounded-sm`}
      >
        {isPending ? "Summarizing..." : "Scrape and Summarize"}
      </button>
    </form>
  );
}
