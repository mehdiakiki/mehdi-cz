"use client";

import { useForm, ValidationError } from "@formspree/react";
import { useState } from "react";

const ContactForm = () => {
  const [state, handleSubmit] = useForm(process.env.NEXT_PUBLIC_FORMSPREE_KEY || "");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

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
      errors.helpType = "Please select what you need help with";
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      e.preventDefault();
      return false;
    }

    handleSubmit(e);
  };

  if (state.succeeded) {
    return (
      <div className="space-y-4 pb-8 pt-6 text-center">
        <h1 className="text-4xl font-extrabold">Thank You!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Thanks — I got your inquiry. I'll reply within 24 hours.
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

      <div>
        <label htmlFor="name" className="text-md block text-left font-medium text-white">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          minLength={2}
          maxLength={80}
          placeholder="Your name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <ValidationError prefix="Name" field="name" errors={state.errors} />
      </div>

      <div>
        <label htmlFor="email" className="text-md block text-left font-medium text-white">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          maxLength={254}
          placeholder="you@company.com"
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:ring-primary-500 ${
            validationErrors.email
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-primary-500"
          }`}
        />
        {validationErrors.email && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.email}</p>
        )}
        <ValidationError prefix="Email" field="email" errors={state.errors} />
      </div>

      <div>
        <label htmlFor="help-type" className="text-md block text-left font-medium text-white">
          What do you need help with? <span className="text-red-500">*</span>
        </label>
        <select
          id="help-type"
          name="help-type"
          className={`mt-1 block w-full rounded-md border px-3 py-2 text-gray-900 shadow-sm focus:ring-primary-500 ${
            validationErrors.helpType
              ? "border-red-500 focus:border-red-500"
              : "border-gray-300 focus:border-primary-500"
          }`}
        >
          <option value="">Select one...</option>
          <option value="Build a new feature">Build a new feature</option>
          <option value="Fix a bug / production issue">Fix a bug / production issue</option>
          <option value="Performance / scaling work">Performance / scaling work</option>
          <option value="Codebase cleanup / refactor">Codebase cleanup / refactor</option>
          <option value="Architecture / tech direction">Architecture / tech direction</option>
          <option value="Ongoing help (retainer)">Ongoing help (retainer)</option>
          <option value="Other">Other</option>
        </select>
        {validationErrors.helpType && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{validationErrors.helpType}</p>
        )}
        <ValidationError prefix="Help type" field="help-type" errors={state.errors} />
      </div>

      <div>
        <label htmlFor="budget" className="text-md block text-left font-medium text-white">
          Budget range
        </label>
        <select
          id="budget"
          name="budget"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        >
          <option value="">Select budget...</option>
          <option value="< $2k">&lt; $2k</option>
          <option value="$2–5k">$2–5k</option>
          <option value="$5–10k">$5–10k</option>
          <option value="$10–20k">$10–20k</option>
          <option value="$20k+">$20k+</option>
        </select>
        <ValidationError prefix="Budget" field="budget" errors={state.errors} />
      </div>

      <div>
        <label htmlFor="details" className="text-md block text-left font-medium text-white">
          Details
        </label>
        <textarea
          id="details"
          name="details"
          rows={6}
          maxLength={2000}
          placeholder="Tell me about your project, timeline, constraints, etc."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <ValidationError prefix="Details" field="details" errors={state.errors} />
      </div>

      <div>
        <label htmlFor="links" className="text-md block text-left font-medium text-white">
          Links
        </label>
        <input
          type="text"
          id="links"
          name="links"
          maxLength={300}
          placeholder="Website / repo / Loom / spec doc"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <ValidationError prefix="Links" field="links" errors={state.errors} />
      </div>

      <div className="text-center">
        <button
          type="submit"
          disabled={state.submitting}
          className="text-md inline-flex items-center rounded-md bg-primary-500 px-6 py-3 font-semibold text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {state.submitting ? "Sending..." : "Send Project Inquiry"}
        </button>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Typical response time: within 24 hours.
        </p>
      </div>
    </form>
  );
};

export default ContactForm;
