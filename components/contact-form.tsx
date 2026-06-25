"use client";

import type { Dictionary } from "@/messages/en";

type ContactFormProps = {
  deliveryEmail: string;
  dict: Dictionary["contact"];
};

export function ContactForm({ deliveryEmail, dict }: ContactFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "");
    const replyEmail = String(formData.get("replyEmail") ?? "");
    const message = String(formData.get("message") ?? "");

    const subject = "[AI Pick & Report] Contact";
    const body = `Name: ${name}\nReply-To: ${replyEmail}\n\n${message}`;

    window.location.href = `mailto:${deliveryEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
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
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
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
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
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
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none ring-accent focus:ring-2"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-accent px-6 py-2.5 font-sans text-sm font-medium text-white transition hover:opacity-90"
      >
        {dict.submit}
      </button>
    </form>
  );
}
