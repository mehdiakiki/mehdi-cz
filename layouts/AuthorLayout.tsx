import { ReactNode } from "react";
import type { Authors } from "contentlayer/generated";
import SocialIcon from "@/components/social-icons";
import Image from "@/components/Image";

interface Props {
  children: ReactNode;
  content: Omit<Authors, "_id" | "_raw" | "body">;
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, file, linkedin, github } = content;

  return (
    <>
      <div className="space-y-4 pt-6 pb-8">
        <h1 className="text-center text-4xl leading-tight font-bold tracking-tight text-gray-900 md:text-6xl dark:text-gray-100">
          About
        </h1>
        <p className="text-center text-lg font-medium text-gray-500 md:text-xl dark:text-gray-400">
          The path behind the systems, products, and open-source work.
        </p>
      </div>
      <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:space-y-0 xl:gap-x-8">
        <div className="flex flex-col items-center space-x-2 pt-8">
          {avatar && (
            <Image
              src={avatar}
              alt={`${name} profile picture`}
              width={192}
              height={192}
              className="h-48 w-48 rounded-full"
              blur={true}
              quality={90}
            />
          )}
          <h2 className="pt-4 pb-2 text-2xl leading-8 font-bold tracking-tight">{name}</h2>
          {occupation && <div className="text-gray-500 dark:text-gray-400">{occupation}</div>}
          {company && (
            <div className="dark:text-primary-400 font-bold text-gray-500">{company}</div>
          )}
          <div className="flex space-x-3 pt-6">
            <SocialIcon kind="mail" href={`mailto:${email}`} />
            <SocialIcon kind="github" href={github} />
            <SocialIcon kind="linkedin" href={linkedin} />
          </div>
          {file && (
            <a
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-700 hover:bg-primary-800 mt-4 inline-block rounded-lg px-4 py-1.5 text-sm font-semibold text-white transition-colors"
            >
              Resume / CV
            </a>
          )}
        </div>

        <div className="prose dark:prose-invert pt-8 pb-8 text-lg xl:col-span-2">{children}</div>
      </div>
    </>
  );
}
