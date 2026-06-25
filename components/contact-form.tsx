"use client";

import { useState } from "react";
import { CONTACT_FORM_EMAIL, FORM_SUBMIT_ENDPOINT } from "@/lib/contact-client";
import type { Dictionary } from "@/messages/en";

type ContactFormProps = {
  dict: Dictionary["contact"];
};

type FormStatus = "idle" | "loading" | "success" | "error";

type FormSubmitResponse = {
  success?: boolean | string;
  message?: string;
};

function isFormSubmitSuccess(data: FormSubmitResponse): boolean {
  return data.success === true || data.success === "true";
}

export function ContactForm({ dict }: ContactFormProps) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("replyEmail") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    try {
      const response = await fetch(FORM_SUBMIT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          message,
          _subject: `[AI Pick & Report] Contact from ${name}`,
          _replyto: email,
          _captcha: "false",
          _template: "table",
        }),
      });

      const data = (await response.json()) as FormSubmitResponse;

      if (isFormSubmitSuccess(data)) {
        setStatus("success");
        form.reset();
        return;
      }

      const activationRequired = String(data.message ?? "")
        .toLowerCase()
        .includes("activation");

      if (activationRequired) {
        setErrorMessage(dict.errorActivation);
        setStatus("error");
        return;
      }

      const apiResponse = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      if (apiResponse.ok) {
        setStatus("success");
        form.reset();
        return;
      }

      setErrorMessage(dict.errorGeneric);
      setStatus("error");
    } catch {
      setErrorMessage(dict.errorGeneric);
      setStatus("error");
    }
  }

  return (
    <div className="mt-10">
      {status === "success" ? (
        <p
          className="mb-6 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-4 font-sans text-sm text-green-700 dark:text-green-300"
          role="status"
        >
          {dict.successMessage}
        </p>
      ) : null}

      {status === "error" ? (
        <p
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 font-sans text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="contact-name"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.nameLabel}
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            disabled={status === "loading"}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="contact-reply"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.emailLabel}
          </label>
          <input
            id="contact-reply"
            name="replyEmail"
            type="email"
            required
            disabled={status === "loading"}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2 disabled:opacity-60"
          />
        </div>
        <div>
          <label
            htmlFor="contact-message"
            className="mb-2 block font-sans text-sm font-medium text-foreground"
          >
            {dict.messageLabel}
          </label>
          <textarea
            id="contact-message"
            name="message"
            rows={6}
            required
            disabled={status === "loading"}
            className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2 disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded-lg bg-accent px-6 py-2.5 font-sans text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? dict.submitting : dict.submit}
        </button>
      </form>

      <p className="sr-only">{CONTACT_FORM_EMAIL}</p>
    </div>
  );
}
