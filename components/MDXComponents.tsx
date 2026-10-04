import TOCInline from "pliny/ui/TOCInline";
import BlogNewsletterForm from "pliny/ui/BlogNewsletterForm";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import Image from "./Image";
import CustomLink from "./Link";
import TableWrapper from "./TableWrapper";
import CodePlayground from "./ClientOnlyCodePlayground";
import Pre from "./Pre";

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
      blur={true}
      quality={80}
      sizes="(max-width: 639px) calc( 100vw - 2rem), (max-width: 1279px) min(calc( 100vw - 3rem), 720px), 762px"
      className="rounded-lg"
      {...rest}
    />
  );
};

const AccessibleBlogNewsletterForm = (props: ComponentProps<typeof BlogNewsletterForm>) => (
  <div className="[&_button]:bg-primary-700 [&_button:hover]:bg-primary-800">
    <BlogNewsletterForm {...props} />
  </div>
);

export const components: MDXComponents = {
  Image: MDXImage,
  img: MDXImage, // Also handle regular img tags
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  BlogNewsletterForm: AccessibleBlogNewsletterForm,
  CodePlayground,
};
