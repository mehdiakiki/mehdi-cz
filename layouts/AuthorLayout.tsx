import { ReactNode } from "react";
import type { Authors } from "contentlayer/generated";
import SocialIcon from "@/components/social-icons";
import Image from "@/components/Image";

import MainProject from "@/components/MainProject";
import { mainProjectData as d } from "@/data/projectsData";

interface Props {
  children: ReactNode;
  content: Omit<Authors, "_id" | "_raw" | "body">;
}

export default function AuthorLayout({ children, content }: Props) {
  const { name, avatar, occupation, company, email, file, linkedin, github } = content;

  return (
    <>
      <div className="space-y-4 pb-8 pt-6">
        <h1 className="text-center text-2xl font-extrabold leading-9 tracking-tight text-gray-900 dark:text-gray-100 sm:text-3xl sm:leading-10 md:text-5xl md:leading-14">
          Mehdi Akiki · Software Engineer
        </h1>
        <p className="text-center text-lg font-medium text-gray-500 dark:text-gray-400 md:text-xl">
          Systems thinking. Full-stack execution. Open-source depth.
        </p>
      </div>
      <div className="items-start space-y-2 xl:grid xl:grid-cols-3 xl:gap-x-8 xl:space-y-0">
        <div className="flex flex-col items-center space-x-2 pt-8">
          {avatar && (
            <Image
              src={avatar}
              alt={`${name} profile picture`}
              width={192}
              height={192}
              className="h-48 w-48 rounded-full"
              priority={true}
              quality={90}
            />
          )}
          <h3 className="pb-2 pt-4 text-2xl font-bold leading-8 tracking-tight">{name}</h3>
          <div className="text-gray-500 dark:text-gray-400">{occupation}</div>
          <div className="font-bold text-gray-500 dark:text-primary-400">{company}</div>
          <div className="flex space-x-3 pt-6">
            <SocialIcon kind="mail" href={`mailto:${email}`} />
            <SocialIcon kind="github" href={github} />
            <SocialIcon kind="linkedin" href={linkedin} />
            <SocialIcon kind="file" href={file} />
          </div>
        </div>

        <div className="prose pb-8 pt-8 text-lg dark:prose-invert xl:col-span-2">{children}</div>
      </div>

      <div className="col-span-3 mt-10 w-full">
        <MainProject
          key={d.title}
          title={d.title}
          description={d.description}
          imgSrc={d.imgSrc}
          href={d.href}
        />
      </div>
    </>
  );
}
