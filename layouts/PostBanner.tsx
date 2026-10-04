import { ReactNode } from "react";
import Image from "@/components/Image";
import Bleed from "pliny/ui/Bleed";
import { CoreContent } from "pliny/utils/contentlayer";
import type { Blog } from "contentlayer/generated";
import dynamic from "next/dynamic";
const Comments = dynamic(() => import("@/components/Comments"));
import Link from "@/components/Link";
import PageTitle from "@/components/PageTitle";
import SectionContainer from "@/components/SectionContainer";
import siteMetadata from "@/data/siteMetadata";
import ScrollTopAndComment from "@/components/ScrollTopAndComment";

interface LayoutProps {
  content: CoreContent<Blog>;
  children: ReactNode;
  next?: { path: string; title: string };
  prev?: { path: string; title: string };
}

export default function PostMinimal({ content, next, prev, children }: LayoutProps) {
  const { slug, title, images } = content;
  const displayImage =
    images && images.length > 0 ? images[0] : "https://picsum.photos/seed/picsum/800/400";

  return (
    <SectionContainer>
      <ScrollTopAndComment />
      <article>
        <div>
          <div className="space-y-1 pb-10 text-center dark:border-gray-700">
            <div className="w-full">
              <Bleed>
                <div className="relative aspect-[2/1] w-full">
                  <Image
                    src={displayImage}
                    alt={`${title} - Featured image`}
                    fill
                    className="object-cover"
                    preload={true}
                    quality={85}
                    sizes="(max-width: 767px) calc( 100vw + 1rem), (max-width: 1279px) 784px, (max-width: 1535px) 1088px, 1216px"
                  />
                </div>
              </Bleed>
            </div>
            <div className="relative pt-10">
              <PageTitle>{title}</PageTitle>
            </div>
          </div>
          <div className="prose dark:prose-invert max-w-none py-4">{children}</div>
          {siteMetadata.comments && (
            <div className="pt-6 pb-6 text-center text-gray-700 dark:text-gray-300" id="comment">
              <Comments slug={slug} />
            </div>
          )}
          <footer>
            <div className="flex flex-col text-sm font-medium sm:flex-row sm:justify-between sm:text-base">
              {prev && prev.path && (
                <div className="pt-4 xl:pt-8">
                  <Link
                    href={`/${prev.path}`}
                    className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    aria-label={`Previous post: ${prev.title}`}
                  >
                    &larr; {prev.title}
                  </Link>
                </div>
              )}
              {next && next.path && (
                <div className="pt-4 xl:pt-8">
                  <Link
                    href={`/${next.path}`}
                    className="text-primary-700 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                    aria-label={`Next post: ${next.title}`}
                  >
                    {next.title} &rarr;
                  </Link>
                </div>
              )}
            </div>
          </footer>
        </div>
      </article>
    </SectionContainer>
  );
}
