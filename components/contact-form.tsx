"use client";

import { useState } from "react";
import type { Dictionary } from "@/messages/en";

type ContactFormProps = {
  dict: Dictionary["contact"];
};

type FormStatus = "idle" | "loading" | "success" | "error";

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
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(
          data.error === "not_configured"
            ? dict.errorNotConfigured
            : dict.errorGeneric,
        );
        setStatus("error");
        return;
      }

      setStatus("success");
      form.reset();
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
    </div>
  );
}
