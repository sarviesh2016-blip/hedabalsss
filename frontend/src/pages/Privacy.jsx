import React from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Privacy() {
  return (
    <MarketingLayout>
      <section className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid="privacy-page">
        <p className="chip">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Privacy Policy</h1>
        <p className="text-secondary mt-3 text-sm">Last updated: February 13, 2026</p>

        <div className="prose prose-zinc max-w-none mt-10 space-y-6 text-secondary leading-relaxed">
          <div>
            <h2 className="text-2xl font-heading text-zinc-900">1. Who we are</h2>
            <p>VideosToPrompt.com ("we", "us", or "our") is an AI-powered service operated from Bengaluru, India that turns videos into structured AI prompts. By accessing or using the service, you agree to this Privacy Policy.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">2. What data we collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Account data:</strong> email, name, profile picture from Google OAuth.</li>
              <li><strong>Videos you upload:</strong> stored privately and tied to your account. You can delete them anytime.</li>
              <li><strong>Generations:</strong> the prompts our AI produces from your videos.</li>
              <li><strong>Payment data:</strong> handled by Razorpay; we never see your card details.</li>
              <li><strong>Usage:</strong> standard logs (IP, user-agent) for security and abuse prevention.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">3. How we use it</h2>
            <p>To deliver the service (process your videos, generate prompts, run your account), to bill you, to improve product quality in aggregate, and to comply with legal obligations.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">4. Who we share with</h2>
            <p>AI providers (Google Gemini, Groq) for prompt generation, Razorpay for payments, Google for sign-in, and our hosting provider. We do not sell your data.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">5. Your rights</h2>
            <p>You can access, export, or delete your data at any time from your dashboard, or by contacting <span className="text-violet-700">hello@videostoprompt.com</span>.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">6. Cookies & analytics</h2>
            <p>We use first-party cookies for sign-in sessions and (optionally) Google Analytics / Tag Manager / Meta Pixel for product analytics. You can disable cookies in your browser.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">7. Children</h2>
            <p>The service is not directed at children under 13. We do not knowingly collect data from them.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">8. Changes</h2>
            <p>We may update this policy. Material changes will be announced on this page.</p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
