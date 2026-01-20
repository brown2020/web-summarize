import { LANGUAGES } from "@/constants/summarizer";
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
import { Language, type ModelOption } from "@/types/summarizer";
import { capitalize, clampNumber } from "@/lib/utils";

type SummarizerFormProps = {
  onSubmit: () => Promise<void>;
  modelOptions: ModelOption[];
};

export function SummarizerForm({ onSubmit, modelOptions }: SummarizerFormProps) {
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
  const [wordsInput, setWordsInput] = useState<string>(String(numWords));
  const hasModels = modelOptions.length > 0;

  const handleWordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Allow empty string for typing
    if (value === "") {
      setWordsInput("");
      return;
    }

    // Only allow digits
    if (!/^\d+$/.test(value)) return;

    // Remove leading zeros and update
    const cleanValue = value.replace(/^0+/, "") || "0";
    setWordsInput(cleanValue);

    const num = parseInt(cleanValue, 10);
    if (!isNaN(num)) {
      setNumWords(clampNumber(num, VALIDATION.MIN_WORDS, VALIDATION.MAX_WORDS));
    }
  };

  const handleWordsBlur = () => {
    // On blur, ensure we have a valid value
    const num = parseInt(wordsInput, 10);
    const nextNumWords = clampNumber(
      Number.isFinite(num) ? num : VALIDATION.MIN_WORDS,
      VALIDATION.MIN_WORDS,
      VALIDATION.MAX_WORDS
    );
    setWordsInput(String(nextNumWords));
    setNumWords(nextNumWords);
  };

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

    void onSubmit();
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
                  {capitalize(lang)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="model-select">Select Model</Label>
          <Select
            value={modelName}
            onValueChange={setModelName}
            disabled={!hasModels}
          >
            <SelectTrigger id="model-select">
              <SelectValue placeholder={hasModels ? "Select Model" : "No models available"} />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasModels && (
            <p className="text-xs text-destructive">
              No AI providers are configured. Add an API key to enable models.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="words-input">Number of Words</Label>
        <Input
          id="words-input"
          type="text"
          inputMode="numeric"
          value={wordsInput}
          onChange={handleWordsChange}
          onBlur={handleWordsBlur}
          placeholder="Enter number of words"
          aria-describedby="words-help"
        />
        <p id="words-help" className="text-xs text-muted-foreground">
          Between {VALIDATION.MIN_WORDS} and {VALIDATION.MAX_WORDS} words
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending || !!urlError || !hasModels}
        className="w-full"
        size="lg"
      >
        {isPending ? "Summarizing..." : "Scrape and Summarize"}
      </Button>
    </form>
  );
}
