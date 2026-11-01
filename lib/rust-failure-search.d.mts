export type SearchableRustFailure = {
  id: string;
  area: string;
  symptom: string;
  areaLabel?: string;
  destinationTitle?: string;
  likelyCause?: string;
  firstCheck?: string;
  searchTerms?: string[];
  evidence?: string[];
};

export type PreparedRustFailure<T extends SearchableRustFailure> = {
  entry: T;
  order: number;
  fields: Array<{ value: string; words: Set<string>; weight: number }>;
  all: string;
  codes: Set<string>;
};

export function prepareRustFailureSearch<T extends SearchableRustFailure>(
  entries: T[]
): PreparedRustFailure<T>[];
export function searchRustFailures<T extends SearchableRustFailure>(
  index: PreparedRustFailure<T>[],
  options?: { query?: string; area?: string }
): T[];
export function rustFailureResultPage<T>(
  entries: T[],
  requestedPage: unknown,
  pageSize?: number
): {
  entries: T[];
  page: number;
  pageCount: number;
  total: number;
  start: number;
  end: number;
};
