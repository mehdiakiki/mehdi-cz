import DeferredStylesheet from "@/components/DeferredStylesheet";
import { articleStyleAssets } from "../lib/generated/article-style-assets";

interface ArticleStylesProps {
  prism: boolean;
  katex: boolean;
}

const withBasePath = (assetPath: string) => `${process.env.BASE_PATH || ""}${assetPath}`;

export default function ArticleStyles({ prism, katex }: ArticleStylesProps) {
  return (
    <>
      {prism && (
        <link
          rel="stylesheet"
          href={withBasePath(articleStyleAssets.prism)}
          precedence="article-prism"
          data-article-style="prism"
        />
      )}
      {katex && (
        <DeferredStylesheet
          href={withBasePath(articleStyleAssets.katex)}
          marker="katex"
          promoterSrc={withBasePath(articleStyleAssets.promoter)}
        />
      )}
    </>
  );
}
