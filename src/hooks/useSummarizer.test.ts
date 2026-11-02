// @vitest-environment happy-dom
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PROGRESS_STEPS } from "@/constants/app";
import { getCurrentIdToken } from "@/lib/firebase/client";
import { useSummarizerStore } from "@/store/summarizerStore";
import { useSummarizer } from "./useSummarizer";

vi.mock("@/lib/firebase/client", () => ({
  getCurrentIdToken: vi.fn(),
}));

vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  });
  return { toast };
});

const extracted = "Readable article text extracted from the public page.";
const summary = "A short streamed summary of the article.";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    body: null,
    json: async () => body,
  } as Response;
}

function streamResponse(text: string) {
  const bytes = new TextEncoder().encode(text);
  let sent = false;
  const reader = {
    read: async () => {
      if (sent) return { done: true as const, value: undefined };
      sent = true;
      return { done: false as const, value: bytes };
    },
    cancel: async () => {
      sent = true;
    },
  };
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new Error("summary body is a stream");
    },
    body: {
      getReader: () => reader,
      cancel: async () => {
        sent = true;
      },
    },
  } as unknown as Response;
}

function renderSummarizer() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let current: ReturnType<typeof useSummarizer> | null = null;

  function Probe(): ReactNode {
    current = useSummarizer();
    return null;
  }

  act(() => {
    root.render(createElement(Probe));
  });

  return {
    root,
    container,
    get current() {
      if (!current) throw new Error("hook did not render");
      return current;
    },
  };
}

describe("useSummarizer main flow", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    vi.mocked(getCurrentIdToken).mockReset();
    vi.mocked(getCurrentIdToken).mockResolvedValue("good-token");
    useSummarizerStore.setState({
      url: "https://example.com/story",
      language: "english",
      modelName: "gpt-4.1",
      numWords: 40,
      extractedText: "",
      summary: "",
      isPending: false,
      progress: PROGRESS_STEPS.INITIAL,
      error: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/proxy")) return jsonResponse({ text: extracted });
        if (url.endsWith("/api/summarize")) {
          expect(init?.method).toBe("POST");
          return streamResponse(summary);
        }
        throw new Error(`unexpected fetch ${url}`);
      })
    );
  });

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = null;
    container = null;
    vi.unstubAllGlobals();
  });

  it("scrapes a page and streams a summary for the signed-in user", async () => {
    const view = renderSummarizer();
    root = view.root;
    container = view.container;

    await act(async () => {
      await view.current.scrapeAndSummarize();
    });

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const proxyInit = fetchMock.mock.calls[0][1];
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/proxy");
    expect(proxyInit?.method).toBe("POST");
    expect(JSON.parse(String(proxyInit?.body))).toEqual({
      url: "https://example.com/story",
    });

    const summaryInit = fetchMock.mock.calls[1][1];
    expect(String(fetchMock.mock.calls[1][0])).toBe("/api/summarize");
    expect(new Headers(summaryInit?.headers).get("Authorization")).toBe("Bearer good-token");
    expect(JSON.parse(String(summaryInit?.body))).toEqual({
      document: extracted,
      language: "english",
      modelName: "gpt-4.1",
      numWords: 40,
    });

    const state = useSummarizerStore.getState();
    expect(state.extractedText).toBe(extracted);
    expect(state.summary).toBe(summary);
    expect(state.progress).toBe(PROGRESS_STEPS.COMPLETE);
    expect(state.isPending).toBe(false);
    expect(state.error).toBeNull();
  });

  it("does not summarize when the user is signed out", async () => {
    vi.mocked(getCurrentIdToken).mockResolvedValue(null);
    const view = renderSummarizer();
    root = view.root;
    container = view.container;

    await act(async () => {
      await view.current.scrapeAndSummarize();
    });

    expect(vi.mocked(fetch).mock.calls.map((call) => String(call[0]))).toEqual(["/api/proxy"]);
    const state = useSummarizerStore.getState();
    expect(state.extractedText).toBe(extracted);
    expect(state.summary).toBe("");
    expect(state.error).toBe("Sign in to generate a summary.");
    expect(state.isPending).toBe(false);
    expect(state.progress).toBe(PROGRESS_STEPS.INITIAL);
  });

  it("summarizes edited text without scraping again", async () => {
    const view = renderSummarizer();
    root = view.root;
    container = view.container;
    const edited = "Edited extract that the reader wants summarized.";

    await act(async () => {
      await view.current.summarizeText(edited);
    });

    expect(vi.mocked(fetch).mock.calls.map((call) => String(call[0]))).toEqual([
      "/api/summarize",
    ]);
    const state = useSummarizerStore.getState();
    expect(state.extractedText).toBe(edited);
    expect(state.summary).toBe(summary);
    expect(state.progress).toBe(PROGRESS_STEPS.COMPLETE);
    expect(state.error).toBeNull();
  });

  it("aborts an in-flight scrape when the reader stops streaming", async () => {
    let signal: AbortSignal | undefined;
    vi.mocked(fetch).mockImplementation((_input, init) => {
      signal = init?.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      });
    });

    const view = renderSummarizer();
    root = view.root;
    container = view.container;

    let run: Promise<void> = Promise.resolve();
    act(() => {
      run = view.current.scrapeAndSummarize();
    });

    expect(signal?.aborted).toBe(false);

    await act(async () => {
      view.current.cancel();
      await run;
    });

    expect(signal?.aborted).toBe(true);
    const state = useSummarizerStore.getState();
    expect(state.isPending).toBe(false);
    expect(state.error).toBeNull();
    expect(state.progress).toBe(PROGRESS_STEPS.INITIAL);
  });
});
