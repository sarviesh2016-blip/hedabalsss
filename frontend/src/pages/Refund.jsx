import React from "react";
import MarketingLayout from "@/components/MarketingLayout";

export default function Refund() {
  return (
    <MarketingLayout>
      <section className="py-16 max-w-3xl mx-auto px-5 lg:px-8" data-testid="refund-page">
        <p className="chip">Legal</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-semibold mt-4">Refund Policy</h1>
        <p className="text-secondary mt-3 text-sm">Last updated: February 13, 2026</p>

        <div className="prose prose-zinc max-w-none mt-10 space-y-6 text-secondary leading-relaxed">
          <div>
            <h2 className="text-2xl font-heading text-zinc-900">Subscriptions</h2>
            <p>You can cancel any subscription from <strong>Billing → Manage</strong>. The plan remains active until the end of the current billing period. We do not pro-rate refunds for the unused portion of a billing cycle.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">Credit packs</h2>
            <p>Credit-pack purchases are <strong>non-refundable</strong> once credits have been used. If you bought a pack and have not used <em>any</em> of it, contact us within 7 days for a full refund.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">Failed generations</h2>
            <p>If our AI returns a fallback/mock result due to a system error or upstream API failure, the credit is <strong>automatically refunded</strong> to your account — you don't need to ask.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">Duplicate or accidental charges</h2>
            <p>For double-charges or other billing disputes, email <span className="text-violet-700">hello@videostoprompt.com</span> with your order ID. We'll investigate within 3 business days.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">How we issue refunds</h2>
            <p>Approved refunds are returned to the original payment method via Razorpay. Bank settlement typically takes 5–7 working days.</p>
          </div>

          <div>
            <h2 className="text-2xl font-heading text-zinc-900">Chargebacks</h2>
            <p>Please contact us before filing a chargeback — we can resolve almost any issue faster than a bank dispute.</p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
