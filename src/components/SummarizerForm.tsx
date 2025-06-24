import { Language } from "@/types/summarizer";
import { LANGUAGES, MODEL_OPTIONS } from "@/constants/summarizer";
import { VALIDATION } from "@/constants/app";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
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
    setUrl(value); // Always set the raw value as user types
    
    // Only validate for error display, don't normalize during typing
    const validation = validateAndNormalizeUrl(value);
    if (validation.isValid) {
      setUrlError("");
    } else {
      setUrlError(validation.error || "Invalid URL");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation before submission
    const validation = validateAndNormalizeUrl(url);
    if (!validation.isValid) {
      setUrlError(validation.error || "Invalid URL");
      return;
    }

    if (validation.normalizedUrl && validation.normalizedUrl !== url) {
      setUrl(validation.normalizedUrl);
    }

    onSubmit(e);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="url-input" className="block text-sm font-medium mb-1">
          Webpage URL:
        </label>
        <input
          id="url-input"
          type="url"
          value={url}
          onChange={(e) => validateUrl(e.target.value)}
          placeholder="Enter a webpage URL (e.g., https://example.com)"
          className={`w-full p-2 border rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            urlError ? "border-red-500" : "border-gray-300"
          }`}
          aria-describedby={urlError ? "url-error" : undefined}
          aria-invalid={!!urlError}
        />
        {urlError && (
          <p id="url-error" className="text-red-500 text-sm mt-1" role="alert">
            {urlError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="language-select" className="block text-sm font-medium mb-1">
          Select Language:
        </label>
        <select
          id="language-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          className="w-full p-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang.charAt(0).toUpperCase() + lang.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="model-select" className="block text-sm font-medium mb-1">
          Select Model:
        </label>
        <select
          id="model-select"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {MODEL_OPTIONS.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="words-input" className="block text-sm font-medium mb-1">
          Number of Words:
        </label>
        <input
          id="words-input"
          type="number"
          value={numWords}
          onChange={(e) => setNumWords(Number(e.target.value))}
          placeholder="Enter number of words"
          className="w-full p-2 border border-gray-300 rounded-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          min={VALIDATION.MIN_WORDS}
          max={VALIDATION.MAX_WORDS}
          aria-describedby="words-help"
        />
        <p id="words-help" className="text-gray-500 text-sm mt-1">
          Between {VALIDATION.MIN_WORDS} and {VALIDATION.MAX_WORDS} words
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending || !!urlError}
        className={`p-2 rounded-sm font-medium transition-colors ${
          isPending || !!urlError 
            ? "bg-gray-400 cursor-not-allowed" 
            : "bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        } text-white`}
        aria-describedby={isPending ? "loading-status" : undefined}
      >
        {isPending ? "Summarizing..." : "Scrape and Summarize"}
      </button>
      {isPending && (
        <span id="loading-status" className="sr-only">
          Processing your request, please wait
        </span>
      )}
    </form>
  );
}
