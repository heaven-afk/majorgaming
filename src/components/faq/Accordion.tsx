"use client";

import { useId, useState } from "react";

/** One answer open at a time; the panel's height eases open and closed. */
export default function Accordion({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  const id = useId();

  return (
    <div className="qa-list">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div className="qa" key={item.q} data-open={isOpen ? "" : undefined} data-rise={i * 0.6}>
            <h3>
              <button
                type="button"
                className="qa__q"
                id={`${id}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${id}-a${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span className="qa__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="qa__text">{item.q}</span>
                <span className="qa__icon" aria-hidden>
                  <i />
                  <i />
                </span>
              </button>
            </h3>
            <div className="qa__a" id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`}>
              <div>
                <p>{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
