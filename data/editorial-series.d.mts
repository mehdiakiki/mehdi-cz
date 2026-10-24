export type EditorialSeries = {
  slug: string;
  title: string;
  description: string;
  introduction: string;
  parts: string[];
};

export const editorialSeries: EditorialSeries[];
export function editorialSeriesForPost(slug: string): EditorialSeries | undefined;
