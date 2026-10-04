"use client";

import { useForm, ValidationError } from "@formspree/react";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, data?: Record<string, string | number | boolean>) => void;
    };
  }
}

const ContactForm = () => {
  const [state, handleSubmit] = useForm(process.env.NEXT_PUBLIC_FORMSPREE_KEY || "");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const trackedSuccess = useRef(false);

  useEffect(() => {
    if (state.succeeded && !trackedSuccess.current) {
      window.umami?.track("contact-form-success", { form: "contact" });
      trackedSuccess.current = true;
    }
  }, [state.succeeded]);

  const validateForm = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const errors: Record<string, string> = {};

    const email = formData.get("email") as string;
    if (!email || email.trim() === "") {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }

    const helpType = formData.get("help-type") as string;
    if (!helpType || helpType === "") {
      errors.helpType = "Please select what you would like to discuss";
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      e.preventDefault();
      return false;
    }

    window.umami?.track("contact-form-valid-submit", {
      form: "contact",
      helpType,
    });
    handleSubmit(e);
  };

  if (state.succeeded) {
    return (
      <div className="space-y-4 pt-6 pb-8 text-center">
        <h2 className="text-3xl font-bold">Message received</h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Thanks for the context. I will reply as soon as I can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={validateForm} className="space-y-6" noValidate>
      {state.errors && Object.keys(state.errors).length > 0 && (
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-800 dark:text-red-200">
            Something went wrong. Please try again.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="text-md block text-left font-medium text-gray-900 dark:text-gray-100"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            maxLength={100}
            autoComplete="name"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm"
          />
        </div>
        <div>
          <label
            htmlFor="company"
            className="text-md block text-left font-medium text-gray-900 dark:text-gray-100"
          >
            Company or team
          </label>
          <input
            type="text"
            id="company"
            name="company"
            maxLength={150}
            autoComplete="organization"
            className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="text-md block text-left font-medium text-gray-900 dark:text-gray-100"
        >
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          maxLength={254}
          autoComplete="email"
          placeholder="you@company.com"
          className={`focus:ring-primary-500 mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ${
            validationErrors.email
              ? "border-red-500 focus:border-red-500"
              : "focus:border-primary-500 border-gray-300"
          }`}
        />
        {validationErrors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
        )}
        <ValidationError prefix="Email" field="email" errors={state.errors} />
      </div>

      <div>
        <label
          htmlFor="help-type"
          className="text-md block text-left font-medium text-gray-900 dark:text-gray-100"
        >
          What would you like to discuss? <span className="text-red-500">*</span>
        </label>
        <select
          id="help-type"
          name="help-type"
          className={`focus:ring-primary-500 mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm ${
            validationErrors.helpType
              ? "border-red-500 focus:border-red-500"
              : "focus:border-primary-500 border-gray-300"
          }`}
        >
          <option value="">Select one...</option>
          <option value="Full-time opportunity">Full-time opportunity</option>
          <option value="AI-enabled product or agent system">
            AI-enabled product or agent system
          </option>
          <option value="Startup or product engineering">Startup or product engineering</option>
          <option value="Architecture or advisory">Architecture or advisory</option>
          <option value="Open-source collaboration">Open-source collaboration</option>
          <option value="Other">Other</option>
        </select>
        {validationErrors.helpType && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.helpType}</p>
        )}
        <ValidationError prefix="Help type" field="help-type" errors={state.errors} />
      </div>

      <div>
        <label
          htmlFor="details"
          className="text-md block text-left font-medium text-gray-900 dark:text-gray-100"
        >
          Context
        </label>
        <textarea
          id="details"
          name="details"
          rows={4}
          maxLength={1000}
          placeholder="What are you working on, what is the current constraint, and why does it matter now?"
          className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm"
        />
        <ValidationError prefix="Details" field="details" errors={state.errors} />
      </div>

      <div className="text-center">
        <button
          type="submit"
          disabled={state.submitting}
          className="text-md bg-primary-700 hover:bg-primary-800 focus:ring-primary-500 inline-flex items-center rounded-md px-6 py-3 font-semibold text-white focus:ring-2 focus:outline-none disabled:opacity-50"
        >
          {state.submitting ? "Sending..." : "Send message"}
        </button>
      </div>
    </form>
  );
};

export default ContactForm;
