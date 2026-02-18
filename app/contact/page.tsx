import ContactForm from "@/components/ContactForm";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Contact",
  description:
    "Get in touch with Mehdi Akiki for consulting, collaborations, or project inquiries via a secure contact form or email.",
});

export default function Contact() {
  const formKey = process.env.NEXT_PUBLIC_FORMSPREE_KEY;

  return (
    <>
      <div className="space-y-4 pb-8 pt-6 text-center">
        <h1 className="text-4xl font-extrabold">Contact Me</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Tell me what you're building (or fixing). I'll reply within 24 hours with next steps.
        </p>
      </div>
      <div className="container mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Book a Call</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Schedule a free 30-minute discovery call to discuss your project.
          </p>
          <div className="pt-4">
            <a
              href="https://cal.com/mehdicz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-lg bg-primary-500 px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700"
            >
              Book a Discovery Call
            </a>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
          <h2 className="mb-4 text-center text-2xl font-bold">Or Send a Message</h2>
          {!formKey ? (
            <div className="text-center">
              <p className="text-lg text-gray-500">
                The contact form is currently unavailable. Please email me at{" "}
                <a href="mailto:mehdi.akiki@gmail.com" className="text-primary-500 underline">
                  mehdi.akiki@gmail.com
                </a>
                .
              </p>
            </div>
          ) : (
            <ContactForm />
          )}
        </div>
      </div>
    </>
  );
}
