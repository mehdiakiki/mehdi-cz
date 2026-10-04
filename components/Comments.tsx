"use client";

import { Comments as CommentsComponent } from "pliny/comments";
import { useEffect, useRef, useState } from "react";
import siteMetadata from "@/data/siteMetadata";

export default function Comments({ slug }: { slug: string }) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [shouldLoad, isLoaded]);

  if (!siteMetadata.comments?.provider) {
    return null;
  }

  return (
    <div ref={containerRef} className="mt-12">
      {shouldLoad ? (
        <CommentsComponent commentsConfig={siteMetadata.comments} slug={slug} key={slug} />
      ) : (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        </div>
      )}
    </div>
  );
}
