import "server-only";
import type { ReactNode } from "react";
import { allBlogs } from "contentlayer/generated";
import { publicArticleHref } from "lib/editorial-navigation.mjs";
import Link from "./Link";

export default function ArticleLink({ slug, children }: { slug: string; children: ReactNode }) {
  const href = publicArticleHref(allBlogs, slug);
  return href ? <Link href={href}>{children}</Link> : <>{children}</>;
}
