"use client";

import { useId, useMemo, useRef, useState } from "react";
import { key } from "@/lib/admin/columns";

export type PickOption = { value: string; label: string; sub?: string };

/**
 * A searchable field: type a few letters, pick from the matches with the mouse or arrow keys.
 * With `allowNew`, a name that isn't on record can be kept as is ("new:<name>"). The choice is
 * sent as a hidden input named `name`.
 */
export default function Picker({
  name,
  label,
  options,
  value: initial = "",
  allowNew,
  placeholder,
  onChange,
  invalid,
}: {
  name: string;
  label: string;
  options: PickOption[];
  value?: string;
  allowNew?: string;
  placeholder?: string;
  onChange?: (value: string, label: string) => void;
  invalid?: boolean;
}) {
  const labelOf = (v: string) => (v.startsWith("new:") ? v.slice(4) : (options.find((o) => o.value === v)?.label ?? ""));
  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState(labelOf(initial));
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const list = useId();
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const k = key(query);
    if (!k) return options.slice(0, 8);
    const starts = options.filter((o) => key(o.label).startsWith(k) || (o.sub && key(o.sub).startsWith(k)));
    const has = options.filter((o) => !starts.includes(o) && (key(o.label).includes(k) || (o.sub && key(o.sub).includes(k))));
    return [...starts, ...has].slice(0, 8);
  }, [query, options]);
  const exact = matches.some((m) => key(m.label) === key(query));
  const items: PickOption[] = [...matches, ...(allowNew && query.trim() && !exact ? [{ value: `new:${query.trim()}`, label: `${allowNew} “${query.trim()}”` }] : [])];

  function choose(o: PickOption) {
    const label = o.value.startsWith("new:") ? o.value.slice(4) : o.label;
    setValue(o.value);
    setQuery(label);
    setOpen(false);
    onChange?.(o.value, label);
  }

  return (
    <div className="ad-picker" data-open={open && items.length ? "" : undefined}>
      <input
        ref={input}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={list}
        aria-autocomplete="list"
        aria-invalid={invalid || undefined}
        aria-activedescendant={open && items[cursor] ? `${list}-${cursor}` : undefined}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setCursor(0);
          if (!e.target.value.trim()) {
            setValue("");
            onChange?.("", "");
          }
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Leaving the field keeps a typed name when new names are allowed, else the last pick.
          setTimeout(() => setOpen(false), 120);
          if (!query.trim()) return;
          if (labelOf(value) === query) return;
          const hit = options.find((o) => key(o.label) === key(query));
          if (hit) choose(hit);
          else if (allowNew) choose({ value: `new:${query.trim()}`, label: query.trim() });
          else setQuery(labelOf(value));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setCursor((c) => Math.min(c + 1, items.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => Math.max(c - 1, 0));
          } else if (e.key === "Enter" && open && items[cursor]) {
            e.preventDefault();
            choose(items[cursor]);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      <input type="hidden" name={name} value={value} />
      {open && items.length > 0 && (
        <ul id={list} role="listbox" className="ad-picker__list">
          {items.map((o, i) => (
            <li
              key={o.value}
              id={`${list}-${i}`}
              role="option"
              aria-selected={i === cursor}
              data-new={o.value.startsWith("new:") ? "" : undefined}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setCursor(i)}
            >
              <span>{o.label}</span>
              {o.sub && <small>{o.sub}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
