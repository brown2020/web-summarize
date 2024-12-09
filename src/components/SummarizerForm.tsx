import { Language } from "@/types/summarizer";
import { LANGUAGES, MODEL_OPTIONS } from "@/constants/summarizer";

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
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div>
        <label>
          Webpage URL:
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a webpage URL"
            className="w-full p-2 border rounded"
          />
        </label>
      </div>

      <div>
        <label>
          Select Language:
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="w-full p-2 border rounded"
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
            className="w-full p-2 border rounded"
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
            className="w-full p-2 border rounded"
            min={10}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="p-2 bg-blue-500 text-white rounded"
      >
        {isPending ? "Summarizing..." : "Scrape and Summarize"}
      </button>
    </form>
  );
}
