const words = [
  "archive",
  "boundary",
  "browser",
  "cache",
  "component",
  "content",
  "document",
  "evidence",
  "flight",
  "framework",
  "hydrate",
  "interaction",
  "latency",
  "measurement",
  "navigation",
  "network",
  "payload",
  "rendering",
  "response",
  "serialization",
  "server",
  "static",
  "stream",
  "transfer",
];

const wordSequence = (recordIndex, length) =>
  Array.from({ length }, (_, wordIndex) => {
    const offset = (recordIndex * 17 + wordIndex * 11 + wordIndex * recordIndex) % words.length;
    return words[offset];
  }).join(" ");

export const RECORD_COUNT = 360;

export const createRecords = () =>
  Array.from({ length: RECORD_COUNT }, (_, index) => {
    const serial = String(index + 1).padStart(4, "0");
    const checksum = ((index + 1) * 2654435761).toString(36).slice(-7).padStart(7, "0");

    return {
      id: `record-${serial}`,
      title: `Rendering record ${serial}: ${wordSequence(index, 7)}`,
      body: `${wordSequence(index, 34)}. ${wordSequence(index + 97, 28)}.`,
      href: `/case/${serial}`,
      fingerprint: `RBD-${serial}-${checksum}`,
    };
  });
