import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Web Summarizer",
  description: "Privacy policy for Web Summarizer",
};

export default function PrivacyPage() {
  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">
        Privacy Policy
      </h1>

      <div className="prose dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Overview</h2>
          <p>
            Web Summarizer is designed with privacy in mind. We do not store,
            sell, or share your personal data. This policy explains how we
            handle information when you use our service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Data We Process
          </h2>
          <p>When you use Web Summarizer, we temporarily process:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>URLs you submit:</strong> We fetch the webpage content
              server-side to extract text for summarization.
            </li>
            <li>
              <strong>Extracted text:</strong> The text content is sent to an AI
              provider to generate your summary.
            </li>
            <li>
              <strong>Your preferences:</strong> Language, model selection, and
              word count are used only to customize your summary.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Data We Do Not Store
          </h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>We do not store URLs you submit</li>
            <li>We do not store extracted webpage content</li>
            <li>We do not store generated summaries</li>
            <li>We do not use cookies for tracking</li>
            <li>We do not create user accounts or profiles</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Third-Party AI Providers
          </h2>
          <p>
            To generate summaries, we send extracted text to AI providers such
            as OpenAI, Anthropic, Google, Mistral, or Fireworks AI. These
            providers have their own privacy policies governing how they handle
            data. We recommend reviewing their policies if you have concerns
            about how your data is processed.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Security</h2>
          <p>
            All data is transmitted over HTTPS. We implement security measures
            to prevent misuse, including blocking requests to private networks
            and validating all URLs before fetching.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
          <p>
            If you have questions about this privacy policy, please open an
            issue on our GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
