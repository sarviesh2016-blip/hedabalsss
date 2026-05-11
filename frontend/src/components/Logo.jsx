import React from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";

export default function Logo({ className = "", iconOnly = false, to = "/" }) {
  // Custom render of the brand using the gradient play icon + clean wordmark
  // so it always reads clearly on dark backgrounds.
  const sizeMap = {
    "h-6": { icon: 18, text: "text-sm" },
    "h-7": { icon: 20, text: "text-base" },
    "h-8": { icon: 22, text: "text-lg" },
    "h-9": { icon: 24, text: "text-lg" },
    "h-10": { icon: 26, text: "text-xl" },
  };
  const cfg = sizeMap[className] || sizeMap["h-8"];

  const content = (
    <div className="inline-flex items-center gap-2.5 select-none">
      <span
        className="inline-flex items-center justify-center rounded-md"
        style={{
          width: cfg.icon + 8,
          height: cfg.icon + 8,
          background: "linear-gradient(135deg, #6366F1 0%, #A855F7 100%)",
          boxShadow: "0 0 14px rgba(139,92,246,0.45)",
        }}
      >
        <Play size={cfg.icon - 6} className="text-zinc-900 fill-white" />
      </span>
      {!iconOnly && (
        <span className={`font-heading font-semibold tracking-tight ${cfg.text}`}>
          videos<span className="gradient-text">to</span>prompt
          <span className="text-secondary text-[0.7em] ml-0.5">.com</span>
        </span>
      )}
    </div>
  );

  if (to) return <Link to={to} data-testid="logo-link" className="inline-flex items-center">{content}</Link>;
  return content;
}
