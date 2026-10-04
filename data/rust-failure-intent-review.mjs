// A stable case ID remains available when two investigations were found to
// answer the same search intent. Discovery surfaces point at the stronger case
// so the Atlas does not ask search engines or readers to choose between copies.
export const rustFailureCanonicalCases = {
  "RFA-358": "RFA-169",
  "RFA-601": "RFA-424",
  "RFA-620": "RFA-073",
  "RFA-626": "RFA-426",
  "RFA-638": "RFA-386",
};

// These pairs share vocabulary but answer different engineering questions.
// Keeping the distinction explicit prevents a future similarity audit from
// silently merging them.
export const rustFailureDistinctIntentReviews = [
  {
    caseIds: ["RFA-055", "RFA-613"],
    distinction: "Direct temporary scope versus a borrowing helper that hides the temporary owner.",
  },
  {
    caseIds: ["RFA-094", "RFA-639"],
    distinction:
      "Explicit packed-field reference versus an implicit borrow introduced by formatting.",
  },
  {
    caseIds: ["RFA-168", "RFA-685"],
    distinction:
      "Ordinary reader panic versus logical mutation through interior state under a read guard.",
  },
  {
    caseIds: ["RFA-206", "RFA-260"],
    distinction: "Complete-validation policy versus ownership of the unvisited iterator remainder.",
  },
  {
    caseIds: ["RFA-206", "RFA-656"],
    distinction: "Unvisited remainder versus skipped lazy side effects and visit counts.",
  },
  {
    caseIds: ["RFA-218", "RFA-665"],
    distinction:
      "Immutable remainder detection versus recovering a mutable tail after fixed-width mutation.",
  },
  {
    caseIds: ["RFA-325", "RFA-674"],
    distinction:
      "Invalid range units versus a once-valid byte range reused after the String changes.",
  },
  {
    caseIds: ["RFA-435", "RFA-480"],
    distinction: "Nested item generic identity versus capture of a dynamic local value.",
  },
  {
    caseIds: ["RFA-436", "RFA-635"],
    distinction:
      "Derive on an associated-type requirement versus derive attached to a function item.",
  },
  {
    caseIds: ["RFA-526", "RFA-632"],
    distinction: "Unlabelled closure break versus a labelled jump across a callable boundary.",
  },
  {
    caseIds: ["RFA-659", "RFA-684"],
    distinction: "Mutex recovery after poison versus an RwLock writer poisoning later readers.",
  },
];

export function canonicalRustFailureCaseId(caseId) {
  return rustFailureCanonicalCases[caseId] || caseId;
}

export function isCanonicalRustFailureCase(caseId) {
  return canonicalRustFailureCaseId(caseId) === caseId;
}

export function hasReviewedDistinctIntent(leftCaseId, rightCaseId) {
  return rustFailureDistinctIntentReviews.some(
    ({ caseIds }) => caseIds.includes(leftCaseId) && caseIds.includes(rightCaseId)
  );
}
