/** Small line icons on a 24px grid. Stroke and fill use currentColor. */

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const PATHS: Record<string, React.ReactNode> = {
  // socials (filled)
  x: <path fill="currentColor" d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.2-8.3L1.9 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z" />,
  instagram: (
    <g {...stroke} strokeWidth={1.8}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
    </g>
  ),
  youtube: (
    <path
      fill="currentColor"
      d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8ZM10 15V9l5.2 3L10 15Z"
    />
  ),
  tiktok: (
    <path
      fill="currentColor"
      d="M16.6 3c.3 2.2 1.7 3.8 3.9 4v3a7.2 7.2 0 0 1-3.9-1.2v6.4A6 6 0 1 1 10.5 9v3.1a2.9 2.9 0 1 0 2.9 3V3h3.2Z"
    />
  ),
  discord: (
    <path
      fill="currentColor"
      d="M19.3 5.4A16.4 16.4 0 0 0 15.2 4l-.5 1a15 15 0 0 0-5.4 0l-.5-1a16.4 16.4 0 0 0-4.1 1.4C2.1 9.3 1.4 13.1 1.8 16.8A16.6 16.6 0 0 0 6.8 19.4l1.1-1.7a10.6 10.6 0 0 1-1.7-.8l.4-.3a11.8 11.8 0 0 0 10.8 0l.4.3a10.6 10.6 0 0 1-1.7.8l1.1 1.7a16.5 16.5 0 0 0 5-2.6c.5-4.3-.8-8-2.9-11.4ZM8.7 14.6c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"
    />
  ),
  // features (line)
  parachute: (
    <g {...stroke}>
      <path d="M3 10a9 7 0 0 1 18 0" />
      <path d="M3 10c1.5-1 3-1 4.5 0 1.5-1 3-1 4.5 0 1.5-1 3-1 4.5 0 1.5-1 3-1 4.5 0" />
      <path d="M3 10l8 8M21 10l-8 8M12 10v7" />
      <rect x="10.5" y="17.5" width="3" height="3" rx="1" />
    </g>
  ),
  trophy: (
    <g {...stroke}>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
    </g>
  ),
  squad: (
    <g {...stroke}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="5" cy="10" r="2" />
      <circle cx="19" cy="10" r="2" />
      <path d="M2 17.5a3.5 3.5 0 0 1 3-3.4M22 17.5a3.5 3.5 0 0 0-3-3.4" />
    </g>
  ),
  chart: (
    <g {...stroke}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </g>
  ),
  crosshair: (
    <g {...stroke}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </g>
  ),
  crown: (
    <g {...stroke}>
      <path d="M3.5 8l4.2 3.5L12 5l4.3 6.5L20.5 8l-1.8 10H5.3L3.5 8Z" />
      <path d="M6 21h12" />
    </g>
  ),
  calendar: (
    <g {...stroke}>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </g>
  ),
  fantasy: (
    <g {...stroke}>
      <rect x="4" y="3.5" width="12" height="16" rx="2.5" transform="rotate(-8 10 11.5)" />
      <path d="M17.5 6.5l2 .5-3.1 13.6-6.8-1.6" />
      <path d="M8.3 9.3l1.4 2.8 3-.6-2 2.3 1 2.9-2.7-1.4-2.4 1.8.4-3-2.4-1.8 3-.4 1-2.6Z" transform="translate(-0.5 -0.5) scale(0.95)" />
    </g>
  ),
  arrow: (
    <g {...stroke}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </g>
  ),
  check: (
    <g {...stroke} strokeWidth={2}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </g>
  ),
  hash: (
    <g {...stroke}>
      <path d="M9.5 4l-2 16M16.5 4l-2 16M4.5 9h16M3.5 15h16" />
    </g>
  ),
  chevron: (
    <g {...stroke}>
      <path d="M9.5 6l6 6-6 6" />
    </g>
  ),
  lock: (
    <g {...stroke}>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </g>
  ),
  plus: (
    <g {...stroke}>
      <path d="M12 5v14M5 12h14" />
    </g>
  ),
  search: (
    <g {...stroke}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" />
    </g>
  ),
  close: (
    <g {...stroke}>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </g>
  ),
  link: (
    <g {...stroke}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </g>
  ),
  "sound-on": (
    <g {...stroke}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </g>
  ),
  "sound-off": (
    <g {...stroke}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </g>
  ),
};

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      {PATHS[name]}
    </svg>
  );
}
