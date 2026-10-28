/** A small round squad crest: initials on a brand-toned disc, picked from the name. */

const TONES = [
  ["#ffd58a", "#f39b2f", "#4a2800"],
  ["#ff9466", "#e2491a", "#fff6ef"],
  ["#8a8b8f", "#4b4c4f", "#f4f2ee"],
  ["#f7ece2", "#dcc7b4", "#3a2a1f"],
  ["#3e3e3e", "#1a1a1a", "#f4f2ee"],
  ["#c9673d", "#7e2e14", "#fde6d6"],
];

export function initials(name: string) {
  const words = name.split(" ");
  return (words.length > 1 ? words.map((w) => w[0]).join("") : name.slice(0, 2)).slice(0, 2).toUpperCase();
}

export function Crest({ name, size = 24, tone }: { name: string; size?: number; tone?: number }) {
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const [a, b, c] = TONES[tone ?? hash % TONES.length];
  return (
    <span className="crest" style={{ "--a": a, "--b": b, "--c": c, "--s": `${size}px` } as React.CSSProperties}>
      {initials(name)}
    </span>
  );
}
