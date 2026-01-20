import { MODEL_CATALOG } from "@/constants/summarizer";
import type { ModelCatalogItem, ModelOption } from "@/types/summarizer";

const hasConfiguredKey = (envKey?: string) =>
  !envKey || Boolean(process.env[envKey]?.trim());

export function getAvailableModels(): ModelOption[] {
  return MODEL_CATALOG.filter((model) => hasConfiguredKey(model.envKey)).map(
    ({ value, label }) => ({ value, label })
  );
}

export function getModelCatalogItem(modelName: string): ModelCatalogItem | null {
  return MODEL_CATALOG.find((model) => model.value === modelName) ?? null;
}

export function assertModelAvailable(modelName: string): ModelCatalogItem {
  const model = getModelCatalogItem(modelName);
  if (!model) {
    throw new Error("Unsupported model selected.");
  }
  if (!hasConfiguredKey(model.envKey)) {
    throw new Error(
      "Selected model is not configured. Please add the required API key."
    );
  }
  return model;
}
