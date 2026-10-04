import siteMetadata from "@/data/siteMetadata";
import SocialIcon from "@/components/social-icons";
import DeferredNewsletterForm from "./DeferredNewsletterForm";
import FooterNavigation from "./FooterNavigation";

export default function Footer() {
  return (
    <footer>
      <div className="mt-16 flex flex-col items-center">
        {siteMetadata.newsletter?.provider && (
          <div className="w-full max-w-md pb-8">
            <DeferredNewsletterForm />
          </div>
        )}
        <div className="mb-3 flex space-x-4">
          <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size={6} />
          <SocialIcon kind="github" href={siteMetadata.github} size={6} />
          <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={6} />
          <SocialIcon kind="x" href={siteMetadata.x} size={6} />
        </div>
        <FooterNavigation />
        <div className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          Systems, infrastructure, and engineering notes.
        </div>
      </div>
    </footer>
  );
}
