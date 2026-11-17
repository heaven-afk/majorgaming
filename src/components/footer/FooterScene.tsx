import { getImageProps } from "next/image";

type Art = {
  src: string;
  width: number;
  height: number;
  /** The part of the artwork to keep in view when it's cropped, as fractions of its size. */
  focus: readonly [number, number];
};

type Props = {
  image: { wide: Art; tall: Art; alt: string };
  children: React.ReactNode;
};

/** Matches the CSS breakpoint where the footer switches to the wide artwork. */
const WIDE = "(min-width: 900px)";

const at = ([x, y]: readonly [number, number]) => `${x * 100}% ${y * 100}%`;

/** The footer's closing scene: the artwork full bleed behind the last call to register. */
export default function FooterScene({ image, children }: Props) {
  // One picture per crop: the wide artwork on desktop, the tall one on phones.
  const common = { alt: image.alt, sizes: "(min-width: 1440px) 1400px, 100vw" };
  const wide = getImageProps({ ...common, ...image.wide }).props;
  const { srcSet: tall, ...rest } = getImageProps({ ...common, ...image.tall }).props;
  const art = (className: string, alt: string) => (
    <picture>
      <source media={WIDE} srcSet={wide.srcSet} width={image.wide.width} height={image.wide.height} />
      <img {...rest} srcSet={tall} className={className} alt={alt} />
    </picture>
  );

  return (
    <div className="zone" style={{ "--focus-wide": at(image.wide.focus), "--focus-tall": at(image.tall.focus) } as React.CSSProperties}>
      <div className="zone__scene">
        {/* Phones: a soft, blurred copy of the scene carries it down to the bottom of the panel. */}
        <span className="zone__glow" aria-hidden>
          {art("zone__art", "")}
        </span>
        {art("zone__art zone__img", image.alt)}
      </div>
      <span className="zone__scrim" aria-hidden />
      <div className="zone__content">{children}</div>
    </div>
  );
}
