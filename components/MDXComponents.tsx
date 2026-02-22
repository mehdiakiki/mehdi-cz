import TOCInline from "pliny/ui/TOCInline";
import Pre from "pliny/ui/Pre";
import BlogNewsletterForm from "pliny/ui/BlogNewsletterForm";
import type { MDXComponents } from "mdx/types";
import Image from "./Image";
import CustomLink from "./Link";
import TableWrapper from "./TableWrapper";
import CodePlayground from "./CodePlayground";

// Custom image component for MDX with optimizations
const MDXImage = (props: any) => {
  const { src, alt, width, height, ...rest } = props;

  // Provide default dimensions if not specified
  const imgWidth = width || 800;
  const imgHeight = height || 600;

  return (
    <Image
      src={src}
      alt={alt || "Blog post image"}
      width={imgWidth}
      height={imgHeight}
      quality={80}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
      className="rounded-lg"
      {...rest}
    />
  );
};

export const components: MDXComponents = {
  Image: MDXImage,
  img: MDXImage, // Also handle regular img tags
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsletterForm,
  CodePlayground,
};
