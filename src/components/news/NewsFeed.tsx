"use client";

import { useState } from "react";
import { categories, newsPage } from "@/content/news";
import { StoryCard, StoryFeature, type StoryItem } from "./StoryCard";

/**
 * The News page's stories: a category filter, the newest matching story as the lead, and the
 * rest in a grid.
 */
export default function NewsFeed({ stories }: { stories: StoryItem[] }) {
  const copy = newsPage;
  const used = categories.filter((c) => stories.some((s) => s.category === c));
  const options = [null, ...used];
  const [category, setCategory] = useState<(typeof options)[number]>(null);
  const shown = stories.filter((s) => !category || s.category === category);
  const [lead, ...rest] = shown;

  return (
    <>
      <div className="nw-filter" role="group" aria-label={copy.filter.label}>
        {options.map((c) => (
          <button key={c ?? "all"} type="button" aria-pressed={c === category} onClick={() => setCategory(c)}>
            {c ?? copy.filter.all}
            <span>{c ? stories.filter((s) => s.category === c).length : stories.length}</span>
          </button>
        ))}
      </div>

      {lead ? (
        <div className="nw-feed" key={category ?? "all"}>
          <StoryFeature story={lead} />
          {rest.length > 0 && (
            <ul className="nw-grid">
              {rest.map((s, i) => (
                <li key={s.slug}>
                  <StoryCard story={s} style={{ "--i": i } as React.CSSProperties} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="tile tm-empty">
          <strong>{copy.empty.title}</strong>
          <p>{copy.empty.body}</p>
        </div>
      )}
    </>
  );
}
