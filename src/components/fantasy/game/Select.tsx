"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icons";

export type Option = { value: string; label: string; hint?: string };

/**
 * Fantasy's own dropdown, in place of the browser's select: a button that opens a list.
 * Arrow keys move, Enter or Space picks, Escape closes, and typing jumps to a match. Long lists
 * (`searchable`) get a filter box at the top.
 */
export function Select({ value, options, onChange, label, searchable, align = "start", className = "" }: { value: string; options: Option[]; onChange: (v: string) => void; label: string; searchable?: boolean; align?: "start" | "end"; className?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;
  }, [options, q]);
  const current = options.find((o) => o.value === value) ?? options[0];

  function show() {
    setQ("");
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }
  function close(focus = true) {
    setOpen(false);
    if (focus) button.current?.focus();
  }
  function pick(o: Option) {
    onChange(o.value);
    close();
  }

  useEffect(() => {
    if (!open) return;
    (searchable ? search.current : list.current)?.focus();
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open, searchable]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${hi}"]`)?.scrollIntoView({ block: "nearest" });
  }, [hi, open]);

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHi((h) => Math.min(shown.length - 1, Math.max(0, h + step)));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setHi(e.key === "Home" ? 0 : shown.length - 1);
    } else if (e.key === "Enter" || (e.key === " " && !searchable)) {
      e.preventDefault();
      if (shown[hi]) pick(shown[hi]);
    } else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      close(e.key === "Escape");
    } else if (!searchable && e.key.length === 1) {
      const now = e.timeStamp;
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const at = shown.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
      if (at >= 0) setHi(at);
    }
  }

  return (
    <div className={`fx-select ${className}`} ref={root} data-open={open ? "" : undefined} data-align={align}>
      <button
        ref={button}
        type="button"
        className="fx-select__button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={`${label}: ${current?.label}`}
        onClick={() => (open ? close() : show())}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="fx-select__label">{label}</span>
        <span className="fx-select__value">{current?.label}</span>
        <Icon name="chevron" size={14} />
      </button>
      {open && (
        <div className="fx-select__pop" onKeyDown={onKey}>
          {searchable && (
            <label className="fx-select__search">
              <Icon name="search" size={14} />
              <input
                ref={search}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setHi(0);
                }}
                placeholder={`Find a ${label.toLowerCase()}`}
                aria-label={`Find a ${label.toLowerCase()}`}
                aria-controls={`${id}-list`}
                aria-activedescendant={shown[hi] ? `${id}-${hi}` : undefined}
              />
            </label>
          )}
          <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label} tabIndex={-1} aria-activedescendant={shown[hi] ? `${id}-${hi}` : undefined}>
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === value}
                data-hi={i === hi ? "" : undefined}
                onPointerMove={() => setHi(i)}
                onClick={() => pick(o)}
              >
                <span>{o.label}</span>
                {o.hint && <small>{o.hint}</small>}
                {o.value === value && <Icon name="check" size={14} />}
              </li>
            ))}
            {!shown.length && <li className="fx-select__none">No matches</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
