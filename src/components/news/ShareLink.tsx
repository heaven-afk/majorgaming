"use client";

import { useState } from "react";
import { newsPage } from "@/content/news";
import { Icon } from "../Icons";

/** Copies the story's address, using the phone's share sheet where there is one. */
export default function ShareLink({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const copy = newsPage.story;

  const share = async () => {
    const url = window.location.href;
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt(copy.copy, url);
    }
  };

  return (
    <button type="button" className="btn-ghost nw-share" onClick={share} data-copied={copied || undefined}>
      <Icon name={copied ? "check" : "link"} size={16} />
      <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
    </button>
  );
}
