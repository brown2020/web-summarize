import { AuthGate } from "@/components/AuthGate";
import ScrapeSummarize from "@/components/ScrapeSummarize";
import { getAvailableModels } from "@/lib/model-availability";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const modelOptions = getAvailableModels();

  return (
    <AuthGate>
      <ScrapeSummarize modelOptions={modelOptions} />
    </AuthGate>
  );
}
