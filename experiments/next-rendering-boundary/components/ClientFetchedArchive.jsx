"use client";

import { useEffect, useState } from "react";
import Archive from "./Archive";

export default function ClientFetchedArchive() {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    let active = true;

    const run = new URLSearchParams(window.location.search).get("run") || "default";

    fetch(`/records?run=${encodeURIComponent(run)}`, { cache: "no-store" })
      .then((response) => response.json())
      .then((nextRecords) => {
        if (active) setRecords(nextRecords);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!records) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => performance.mark("archive-content-painted"));
    });
  }, [records]);

  if (!records) return <p data-loading>Loading the archive after hydration…</p>;

  return <Archive records={records} />;
}
