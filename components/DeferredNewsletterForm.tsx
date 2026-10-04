"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const NewsletterForm = dynamic(() => import("pliny/ui/NewsletterForm"), { ssr: false });

export default function DeferredNewsletterForm() {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    if (!("IntersectionObserver" in window)) {
      const fallback = globalThis.setTimeout(() => setActive(true), 0);
      return () => globalThis.clearTimeout(fallback);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "300px 0px" }
    );

    observer.observe(boundary);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boundaryRef}
      className="[&_button]:bg-primary-700 [&_button:hover]:bg-primary-800 min-h-44 sm:min-h-20"
    >
      {active ? <NewsletterForm /> : null}
    </div>
  );
}
