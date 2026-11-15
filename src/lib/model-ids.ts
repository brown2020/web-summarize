import {
  GATEWAY_MODEL_PREFIX,
  LEGACY_MODEL_SUCCESSORS,
} from "@/constants/summarizer";
import { ModelIdSchema, type ModelId } from "@/types/summarizer";

/**
 * Maps a current, gateway-form, or retired model id to a catalog id.
 * Returns null for ids that belong to no known provider family.
 */
export function resolveModelId(raw: string): ModelId | null {
  const trimmed = raw.trim().toLowerCase();
  const exact = ModelIdSchema.safeParse(trimmed);
  if (exact.success) return exact.data;

  const unprefixed = trimmed.replace(GATEWAY_MODEL_PREFIX, "");
  const native = ModelIdSchema.safeParse(unprefixed);
  if (native.success) return native.data;

  const successor = LEGACY_MODEL_SUCCESSORS.find(([pattern]) => pattern.test(unprefixed));
  return successor?.[1] ?? null;
}
