import { LANGUAGES, MODEL_OPTIONS } from "@/constants/summarizer";
import { VALIDATION } from "@/constants/app";
import { validateAndNormalizeUrl } from "@/utils/url-validation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSummarizerStore } from "@/store/summarizerStore";
import { Language } from "@/types/summarizer";

type SummarizerFormProps = {
  onSubmit: (e: React.FormEvent) => Promise<void>;
};

export function SummarizerForm({ onSubmit }: SummarizerFormProps) {
  const {
    url,
    setUrl,
    language,
    setLanguage,
    modelName,
    setModelName,
    numWords,
    setNumWords,
    isPending,
  } = useSummarizerStore();

  const [urlError, setUrlError] = useState<string>("");

  const validateUrl = (value: string) => {
    setUrl(value);
    const validation = validateAndNormalizeUrl(value);
    if (validation.isValid) {
      setUrlError("");
    } else {
      setUrlError(validation.error || "Invalid URL");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="url-input">Webpage URL</Label>
        <Input
          id="url-input"
          type="text"
          value={url}
          onChange={(e) => validateUrl(e.target.value)}
          placeholder="Enter a webpage URL (e.g., ignite.me or https://example.com)"
          className={urlError ? "border-red-500" : ""}
          aria-invalid={!!urlError}
          aria-describedby={urlError ? "url-error" : undefined}
        />
        {urlError && (
          <p id="url-error" className="text-sm text-red-500" role="alert">
            {urlError}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="language-select">Select Language</Label>
          <Select
            value={language}
            onValueChange={(value) => setLanguage(value as Language)}
          >
            <SelectTrigger id="language-select">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-select">Select Model</Label>
          <Select value={modelName} onValueChange={setModelName}>
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="words-input">Number of Words</Label>
        <Input
          id="words-input"
          type="number"
          value={numWords}
          onChange={(e) => setNumWords(Number(e.target.value))}
          placeholder="Enter number of words"
          min={VALIDATION.MIN_WORDS}
          max={VALIDATION.MAX_WORDS}
          aria-describedby="words-help"
        />
        <p id="words-help" className="text-xs text-muted-foreground">
          Between {VALIDATION.MIN_WORDS} and {VALIDATION.MAX_WORDS} words
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending || !!urlError}
        className="w-full"
        size="lg"
      >
        {isPending ? "Summarizing..." : "Scrape and Summarize"}
      </Button>
    </form>
  );
}
