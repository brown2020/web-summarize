import { MODEL_CATALOG } from "@/constants/summarizer";
import type { ModelCatalogItem, ModelOption } from "@/types/summarizer";
import { resolveModelId } from "@/lib/model-ids";
import { summarizeFixturesEnabled } from "@/lib/summarize-fixtures";

const hasConfiguredKey = (envKey: string) => Boolean(process.env[envKey]?.trim());

export function getAvailableModels(): ModelOption[] {
  if (summarizeFixturesEnabled()) {
    return MODEL_CATALOG.map(({ value, label }) => ({ value, label }));
  }
  return MODEL_CATALOG.filter((model) => hasConfiguredKey(model.envKey)).map(
    ({ value, label }) => ({ value, label })
  );
}

function getModelCatalogItem(modelName: string): ModelCatalogItem | null {
  const modelId = resolveModelId(modelName);
  if (!modelId) return null;
  return MODEL_CATALOG.find((model) => model.value === modelId) ?? null;
}

/** Resolves legacy ids to their successor and checks that its provider key is set. */
export function assertModelAvailable(modelName: string): ModelCatalogItem {
  const model = getModelCatalogItem(modelName);
  if (!model) {
    throw new Error("Unsupported model selected.");
  }
  if (!summarizeFixturesEnabled() && !hasConfiguredKey(model.envKey)) {
    throw new Error(
      "Selected model is not configured. Please add the required API key."
    );
  }
  return model;
}
