import * as Flags from "country-flag-icons/react/3x2";

type FlagSvg = React.ComponentType<React.SVGProps<SVGSVGElement> & { title?: string }>;
const regions = new Intl.DisplayNames(["en"], { type: "region" });

/** A country's flag from its two-letter code (NG, GH, KE…), named for screen readers. */
export function Flag({ code, className }: { code: string; className?: string }) {
  const name = regions.of(code) ?? code;
  const Svg = (Flags as unknown as Record<string, FlagSvg | undefined>)[code.toUpperCase()];
  if (!Svg) return <small className={className}>{code}</small>;
  return <Svg className={className} title={name} role="img" aria-label={name} />;
}
