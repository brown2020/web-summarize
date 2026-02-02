import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Web Summarizer",
  description: "Terms of service for Web Summarizer",
};

export default function TermsPage() {
  return (
    <div className="container max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">
        Terms of Service
      </h1>

      <div className="prose dark:prose-invert max-w-none space-y-6">
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Acceptance of Terms
          </h2>
          <p>
            By using Web Summarizer, you agree to these terms. If you do not
            agree, please do not use the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Description of Service
          </h2>
          <p>
            Web Summarizer fetches publicly accessible webpages and generates
            AI-powered summaries. The service is provided as-is for
            informational purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Acceptable Use</h2>
          <p>You agree not to use this service to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Summarize content you do not have permission to access</li>
            <li>Circumvent paywalls or access restrictions</li>
            <li>Generate summaries for illegal purposes</li>
            <li>Overload the service with automated requests</li>
            <li>Attempt to access private or internal networks</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            No Warranty
          </h2>
          <p>
            This service is provided &quot;as is&quot; without warranties of any kind.
            We do not guarantee:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>The accuracy or completeness of generated summaries</li>
            <li>That the service will be available at all times</li>
            <li>That all webpages can be successfully summarized</li>
          </ul>
          <p className="mt-4">
            AI-generated summaries may contain errors, omissions, or
            misinterpretations. Always verify important information against the
            original source.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Intellectual Property
          </h2>
          <p>
            You are responsible for ensuring you have the right to access and
            summarize any content you submit. We do not claim ownership of
            original content or generated summaries.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Limitation of Liability
          </h2>
          <p>
            To the fullest extent permitted by law, we shall not be liable for
            any indirect, incidental, special, consequential, or punitive
            damages arising from your use of this service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">
            Changes to Terms
          </h2>
          <p>
            We may update these terms at any time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
          <p>
            If you have questions about these terms, please open an issue on our
            GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
