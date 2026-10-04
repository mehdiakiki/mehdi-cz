export type WritingTier = "investigation" | "article" | "reference";

export type WritingThemeSlug = "layers" | "derived-state" | "interrupted-execution" | "measurement";

export type WritingTheme = {
  slug: WritingThemeSlug;
  label: string;
  title: string;
  description: string;
};

export type Investigation = {
  slug: string;
  title: string;
  /** Own page for investigations that do not live in the blog. */
  href?: string;
  summary: string;
  /** The first theme is the primary one. */
  themes: WritingThemeSlug[];
  /** Blog slugs in series order. Empty when the investigation has its own page. */
  parts: string[];
  /** Repository path of the fixture that produced the evidence. */
  evidence?: string;
};

type Classifiable = string | { slug: string; format?: string | null };

export const defaultWritingTier: WritingTier;
export const writingTierLabels: Record<WritingTier, string>;
export const writingThemeSlugs: WritingThemeSlug[];
export const writingThemes: WritingTheme[];
export const investigations: Investigation[];

export function getWritingTheme(slug: unknown): WritingTheme | undefined;
export function writingTier(post: Classifiable): WritingTier;
export function writingThemeOf(post: Classifiable): WritingThemeSlug | undefined;
export function writingRank(post: Classifiable): number;
export function investigationPartOf(
  post: Classifiable
): { investigation: Investigation; index: number } | undefined;
export function investigationHref(investigation: Investigation): string;
export function investigationsForTheme(themeSlug: WritingThemeSlug): Investigation[];
export function articleSlugsForTheme(themeSlug: WritingThemeSlug): string[];
export function referenceSlugsForTheme(themeSlug: WritingThemeSlug): string[];
export function classifiedWritingSlugs(): string[];
