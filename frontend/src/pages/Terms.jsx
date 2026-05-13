import React from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Terms() {
  return (
    <MarketingLayout>
      <section className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid="terms-page">
        <p className="chip">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Terms & Conditions</h1>
        <p className="text-secondary mt-3 text-sm">Last updated: February 13, 2026</p>

        <div className="prose prose-zinc max-w-none mt-10 space-y-6 text-secondary leading-relaxed">
          <div>
            <h2 className="text-2xl font-heading text-zinc-900">1. Acceptance</h2>
            <p>By using VideosToPrompt.com you agree to these Terms. If you don't agree, please do not use the service.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">2. Your account</h2>
            <p>You're responsible for keeping your account credentials safe and for activity that happens under your account. You must be at least 13 years old to sign up.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">3. Acceptable use</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>Do not upload illegal content (CSAM, copyrighted material you don't own, hate speech, etc.).</li>
              <li>Do not attempt to break, reverse-engineer, or scrape the service.</li>
              <li>Do not abuse free credits via multiple accounts.</li>
              <li>Do not use generated prompts to produce content that violates the policies of the downstream AI models (Veo, Sora, Kling, Runway, Midjourney, Flux).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">4. Credits & plans</h2>
            <p>Free accounts receive 2 credits per day. Paid credits expire 12 months after purchase if unused. Subscription plans renew automatically unless cancelled before the renewal date.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">5. Ownership</h2>
            <p>You own your uploaded videos and the prompts generated from them. We retain ownership of the platform, AI pipelines, and the underlying software.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">6. AI output disclaimer</h2>
            <p>Generated prompts are produced by third-party AI models and may contain inaccuracies. You're responsible for reviewing the output before using it commercially.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">7. Termination</h2>
            <p>We may suspend or terminate accounts that violate these Terms. You may delete your account at any time.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">8. Liability</h2>
            <p>The service is provided "as is". To the maximum extent permitted by law, we are not liable for indirect or consequential damages.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">9. Governing law</h2>
            <p>These Terms are governed by the laws of India. Any dispute will be resolved in the courts of Bengaluru, Karnataka.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">10. Contact</h2>
            <p>Questions? Email <span className="text-violet-700">hello@videostoprompt.com</span>.</p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
