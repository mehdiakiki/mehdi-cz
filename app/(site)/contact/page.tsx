import ContactForm from "@/components/ContactForm";
import { genPageMetadata } from "app/seo";

export const metadata = genPageMetadata({
  title: "Contact",
  description:
    "Contact Mehdi Akiki about a role, startup product, architecture engagement, or open-source collaboration.",
});

export default function Contact() {
  const formKey = process.env.NEXT_PUBLIC_FORMSPREE_KEY;

  return (
    <>
      <header className="max-w-3xl pt-8 pb-12 md:pt-12 md:pb-16">
        <p className="text-primary-600 dark:text-primary-400 text-sm font-semibold tracking-[0.16em] uppercase">
          Contact
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight text-gray-950 md:text-6xl dark:text-gray-100">
          Start with the context
        </h1>
        <p className="mt-6 text-xl leading-9 text-gray-600 dark:text-gray-300">
          If you are hiring for a technically demanding role, building a startup or AI-enabled
          product, or working through an architecture or reliability problem, tell me what is
          happening and why it matters now.
        </p>
      </header>

      <div className="grid gap-10 border-t border-gray-200 py-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.7fr)] dark:border-gray-800">
        <section aria-labelledby="send-message">
          <h2 id="send-message" className="text-2xl font-bold text-gray-950 dark:text-gray-100">
            Send a message
          </h2>
          <div className="mt-6">
            {!formKey ? (
              <p className="text-lg leading-8 text-gray-600 dark:text-gray-400">
                The contact form is currently unavailable. Email me at{" "}
                <a
                  href="mailto:hello@mehdi.cz"
                  className="text-primary-700 dark:text-primary-400 font-medium underline"
                  data-umami-event="contact-email-click"
                  data-umami-event-location="form-fallback"
                >
                  hello@mehdi.cz
                </a>
                .
              </p>
            ) : (
              <ContactForm />
            )}
          </div>
        </section>

        <aside className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">Email directly</h2>
            <a
              href="mailto:hello@mehdi.cz"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-2 inline-block font-medium"
              data-umami-event="contact-email-click"
              data-umami-event-location="contact-sidebar"
            >
              hello@mehdi.cz
            </a>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">
              Prefer a conversation?
            </h2>
            <p className="mt-2 leading-7 text-gray-600 dark:text-gray-400">
              Scheduling is available when a live discussion is the clearest next step.
            </p>
            <a
              href="https://cal.com/mehdicz/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mt-3 inline-block font-medium"
              data-umami-event="contact-schedule-click"
              data-umami-event-location="contact-sidebar"
            >
              View availability &rarr;
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
