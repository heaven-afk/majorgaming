/** Owner-selected artwork. Original PNGs are alongside the web-ready WebP files. */
export const heroImages = {
  arrival: { src: "/images/hero/arrival.webp", original: "/images/hero/arrival.png", width: 1086, height: 1448, alt: "A parachutist descending toward a sunlit island, with two teammates far below." },
  return: { src: "/images/hero/return.webp", original: "/images/hero/return.png", width: 1086, height: 1448, alt: "Four Call of Duty teammates returning together to a waiting transport plane at sunset." },
} as const;

/** Character artwork for the decorative community avatar stack; not member portraits. */
export const communityAvatars = [
  { name: "Farah", src: "/images/avatars/farah.webp", original: "/images/avatars/farah.png", width: 256, height: 256, alt: "Farah character avatar" },
  { name: "Ghost", src: "/images/avatars/ghost.webp", original: "/images/avatars/ghost.png", width: 256, height: 256, alt: "Ghost character avatar" },
  { name: "Captain Price", src: "/images/avatars/captain-price.webp", original: "/images/avatars/captain-price.png", width: 256, height: 256, alt: "Captain Price character avatar" },
  { name: "Soap", src: "/images/avatars/soap.webp", original: "/images/avatars/soap.png", width: 256, height: 256, alt: "Soap character avatar" },
] as const;

/** Second set of community character avatars; first set stays unchanged. */
export const additionalCommunityAvatars = [
  { name: "Manta Ray", src: "/images/avatars/manta-ray.webp", original: "/images/avatars/manta-ray.png", width: 256, height: 256, alt: "Manta Ray character avatar" },
  { name: "Urban Tracker", src: "/images/avatars/urban-tracker.webp", original: "/images/avatars/urban-tracker.png", width: 256, height: 256, alt: "Urban Tracker character avatar" },
  { name: "Nikto", src: "/images/avatars/nikto.webp", original: "/images/avatars/nikto.png", width: 256, height: 256, alt: "Nikto character avatar" },
  { name: "Krueger", src: "/images/avatars/krueger.webp", original: "/images/avatars/krueger.png", width: 256, height: 256, alt: "Krueger character avatar" },
] as const;
