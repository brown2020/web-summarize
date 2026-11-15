import { create } from "zustand";
import { Language, ModelId, SummarizerState } from "@/types/summarizer";
import { PROGRESS_STEPS, VALIDATION } from "@/constants/app";
import { DEFAULT_MODEL_ID } from "@/constants/summarizer";

interface SummarizerActions {
  setUrl: (url: string) => void;
  setLanguage: (language: Language) => void;
  setModelName: (modelName: ModelId) => void;
  setNumWords: (numWords: number) => void;
  setExtractedText: (extractedText: string) => void;
  setSummary: (summary: string) => void;
  setIsPending: (isPending: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
}

type SummarizerStore = SummarizerState & SummarizerActions;

const initialState: SummarizerState = {
  url: "",
  language: "english",
  modelName: DEFAULT_MODEL_ID,
  numWords: VALIDATION.DEFAULT_WORDS,
  extractedText: "",
  summary: "",
  isPending: false,
  progress: PROGRESS_STEPS.INITIAL,
  error: null,
};

export const useSummarizerStore = create<SummarizerStore>((set) => ({
  ...initialState,
  setUrl: (url) => set({ url }),
  setLanguage: (language) => set({ language }),
  setModelName: (modelName) => set({ modelName }),
  setNumWords: (numWords) => set({ numWords }),
  setExtractedText: (extractedText) => set({ extractedText }),
  setSummary: (summary) => set({ summary }),
  setIsPending: (isPending) => set({ isPending }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
}));
