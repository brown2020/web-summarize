import { create } from "zustand";
import { Language, SummarizerState } from "@/types/summarizer";
import { PROGRESS_STEPS, VALIDATION } from "@/constants/app";

interface SummarizerActions {
  setUrl: (url: string) => void;
  setLanguage: (language: Language) => void;
  setModelName: (modelName: string) => void;
  setNumWords: (numWords: number) => void;
  setSummary: (summary: string) => void;
  setIsPending: (isPending: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

type SummarizerStore = SummarizerState & SummarizerActions;

const initialState: SummarizerState = {
  url: "",
  language: "english",
  modelName: "gpt-4.1",
  numWords: VALIDATION.DEFAULT_WORDS,
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
  setSummary: (summary) => set({ summary }),
  setIsPending: (isPending) => set({ isPending }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
