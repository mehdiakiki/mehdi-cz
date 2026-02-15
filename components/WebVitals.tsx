"use client";

import { useEffect } from "react";

export default function WebVitals() {
  useEffect(() => {
    const loadWebVitals = async () => {
      try {
        const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import("web-vitals");

        const handleMetric = (metric: any) => {
          if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
            if (window.gtag) {
              window.gtag("event", metric.name, {
                custom_parameter_name: metric.value,
                custom_parameter_delta: metric.delta,
              });
            }
          }
        };

        onCLS(handleMetric);
        onFCP(handleMetric);
        onLCP(handleMetric);
        onTTFB(handleMetric);
        onINP(handleMetric);
      } catch (err) {
        console.warn("Failed to load web-vitals:", err);
      }
    };

    loadWebVitals();
  }, []);

  return null;
}

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
