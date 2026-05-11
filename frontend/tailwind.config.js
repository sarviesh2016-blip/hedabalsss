/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Manrope', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        brand: {
          violet: "#8B5CF6",
          indigo: "#6366F1",
          cyan: "#00E5FF",
          ink: "#050505",
          panel: "#09090B",
        },
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(168,85,247,0.18) 100%)',
        'cyan-glow': 'radial-gradient(ellipse at center, rgba(0,229,255,0.25), transparent 70%)',
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 24px rgba(99,102,241,0.35)" },
          "50%": { boxShadow: "0 0 60px rgba(168,85,247,0.55)" },
        },
        "float": { "0%, 100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-8px)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s ease-out forwards",
        "shimmer": "shimmer 3s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
