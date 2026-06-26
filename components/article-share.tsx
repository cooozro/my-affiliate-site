"use client";

import { useState } from "react";
import { shareViaKakao } from "@/lib/kakao-share";
import { SHARE_PLATFORMS, feedlySubscribeUrl } from "@/lib/share";
import type { Dictionary } from "@/messages/en";

type ArticleShareProps = {
  url: string;
  title: string;
  imageUrl?: string;
  feedUrl: string;
  labels: Dictionary["blog"]["share"];
  variant?: "top" | "bottom";
};

const buttonClassName =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 font-sans text-xs font-medium text-foreground transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent";

function ShareIcon({ id }: { id: string }) {
  switch (id) {
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.881 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 114.127 0 2.063 2.063 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      );
    case "kakao":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.742 1.817 5.144 4.563 6.514-.2-.734-.383-1.866.08-2.674.415-.72 2.688-1.73 2.688-1.73s-.325-.065-.65-.195c-.375-.15-.287-.93.078-.93.345 0 .555.225.555.225s.99-.645 2.79-.645c1.44 0 2.7.39 3.75 1.14C16.35 4.5 18 4.5 18 4.5s.21-.225.555-.225c.365 0 .453.78.078.93-.325.13-.65.195-.65.195s2.273 1.01 2.688 1.73c.463.808.28 1.94.08 2.674C20.183 15.858 22 13.456 22 10.714 22 6.463 17.523 3 12 3z" />
        </svg>
      );
    case "feedly":
      return (
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
          <path d="M4.6 2.2A2.2 2.2 0 002.2 4.4v15.2a2.2 2.2 0 002.2 2.2h14.8a2.2 2.2 0 002.2-2.2V4.4a2.2 2.2 0 00-2.2-2.2H4.6zm2.9 4.1h9.9c.6 0 1.1.5 1.1 1.1v2.2c0 .6-.5 1.1-1.1 1.1H7.5c-.6 0-1.1-.5-1.1-1.1V7.4c0-.6.5-1.1 1.1-1.1zm0 5.5h9.9c.6 0 1.1.5 1.1 1.1v2.2c0 .6-.5 1.1-1.1 1.1H7.5c-.6 0-1.1-.5-1.1-1.1v-2.2c0-.6.5-1.1 1.1-1.1z" />
        </svg>
      );
    default:
      return null;
  }
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-2">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArticleShare({
  url,
  title,
  imageUrl,
  feedUrl,
  labels,
  variant = "top",
}: ArticleShareProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(labels.copyFallback, url);
    }
  }

  async function handleKakaoShare() {
    try {
      await shareViaKakao({ url, title, imageUrl });
    } catch {
      window.prompt(labels.copyFallback, url);
    }
  }

  const wrapperClass =
    variant === "top"
      ? "mb-8 border-b border-border/60 pb-8"
      : "mt-10 border-t border-border/60 pt-8";

  return (
    <section className={wrapperClass} aria-label={labels.ariaLabel}>
      <p className="mb-3 font-sans text-sm font-medium text-foreground">
        {labels.heading}
      </p>
      <div className="flex flex-wrap gap-2">
        {SHARE_PLATFORMS.map((platform) =>
          platform.type === "kakao" ? (
            <button
              key={platform.id}
              type="button"
              onClick={handleKakaoShare}
              className={buttonClassName}
              aria-label={`${labels.shareOn} ${labels.kakao}`}
            >
              <ShareIcon id={platform.id} />
              <span>{labels.kakao}</span>
            </button>
          ) : (
            <a
              key={platform.id}
              href={platform.href(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClassName}
              aria-label={`${labels.shareOn} ${platform.label}`}
            >
              <ShareIcon id={platform.id} />
              <span>{platform.label}</span>
            </a>
          ),
        )}
        <button
          type="button"
          onClick={copyLink}
          className={buttonClassName}
          aria-label={labels.copyLink}
        >
          <LinkIcon />
          <span>{copied ? labels.copied : labels.copyLink}</span>
        </button>
      </div>
      {variant === "bottom" ? (
        <div className="mt-6 border-t border-border/60 pt-6">
          <p className="mb-3 font-sans text-sm font-medium text-foreground">
            {labels.feedHeading}
          </p>
          <a
            href={feedlySubscribeUrl(feedUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName}
            aria-label={`${labels.feedOn} ${labels.feedly}`}
          >
            <ShareIcon id="feedly" />
            <span>{labels.feedly}</span>
          </a>
        </div>
      ) : null}
    </section>
  );
}
