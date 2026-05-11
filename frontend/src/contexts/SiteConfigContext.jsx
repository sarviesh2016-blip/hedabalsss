import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

const SiteConfigContext = createContext({});

export function SiteConfigProvider({ children }) {
  const [cfg, setCfg] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/site-config");
        setCfg(data || {});
        injectAnalytics(data || {});
        injectSEO(data || {});
      } catch {}
    })();
  }, []);

  return (
    <SiteConfigContext.Provider value={cfg}>{children}</SiteConfigContext.Provider>
  );
}

export const useSiteConfig = () => useContext(SiteConfigContext);

function injectAnalytics(cfg) {
  // Google Analytics 4 (GA4)
  if (cfg.ga_measurement_id && !document.getElementById("ga4-loader")) {
    const s = document.createElement("script");
    s.id = "ga4-loader";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.ga_measurement_id)}`;
    document.head.appendChild(s);
    const inline = document.createElement("script");
    inline.id = "ga4-init";
    inline.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${cfg.ga_measurement_id}');`;
    document.head.appendChild(inline);
  }

  // Google Tag Manager
  if (cfg.gtm_id && !document.getElementById("gtm-loader")) {
    const inline = document.createElement("script");
    inline.id = "gtm-loader";
    inline.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0], j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtm_id}');`;
    document.head.appendChild(inline);
  }

  // Facebook / Meta Pixel
  if (cfg.fb_pixel_id && !document.getElementById("fb-pixel")) {
    const inline = document.createElement("script");
    inline.id = "fb-pixel";
    inline.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${cfg.fb_pixel_id}');fbq('track', 'PageView');`;
    document.head.appendChild(inline);
  }
}

function injectSEO(cfg) {
  const setMeta = (name, content, attr = "name") => {
    if (!content) return;
    let el = document.querySelector(`meta[${attr}="${name}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };

  // Webmaster verifications
  setMeta("google-site-verification", cfg.google_site_verification);
  setMeta("msvalidate.01", cfg.bing_site_verification);

  // Default SEO meta
  if (cfg.seo_default_title) document.title = cfg.seo_default_title;
  setMeta("description", cfg.seo_default_description);

  // Open Graph defaults
  setMeta("og:title", cfg.seo_default_title || document.title, "property");
  setMeta("og:description", cfg.seo_default_description, "property");
  setMeta("og:image", cfg.og_image_url, "property");
  setMeta("twitter:card", "summary_large_image");
  setMeta("twitter:title", cfg.seo_default_title || document.title);
  setMeta("twitter:description", cfg.seo_default_description);
  setMeta("twitter:image", cfg.og_image_url);
}
