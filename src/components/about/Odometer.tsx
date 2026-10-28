const DIGITS = [..."01234567890123456789"];

/**
 * A number whose digits roll into place like a mechanical counter once it is on screen.
 * Renders the final value by default, so it reads correctly before any script runs.
 */
export function Odometer({ value, suffix = "" }: { value: number; suffix?: string }) {
  const text = value.toLocaleString("en-US");
  let k = 0;
  return (
    <span className="odo" data-odo>
      <span className="sr-only">
        {text}
        {suffix}
      </span>
      <span className="odo__digits" aria-hidden>
        {[...text].map((ch, i) =>
          /\d/.test(ch) ? (
            <span className="odo__col" key={i} style={{ "--d": ch, "--k": k++ } as React.CSSProperties}>
              <span>
                {DIGITS.map((d, j) => (
                  <span key={j}>{d}</span>
                ))}
              </span>
            </span>
          ) : (
            <span className="odo__sep" key={i}>
              {ch}
            </span>
          ),
        )}
        {suffix && <span className="odo__suffix">{suffix}</span>}
      </span>
    </span>
  );
}
