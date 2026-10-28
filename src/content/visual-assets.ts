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

/** First ten-avatar batch restored at the owner’s request. */
export const communityAvatarsSetThree = [
  {
    "name": "Gaz",
    "src": "/images/avatars/gaz.webp",
    "original": "/images/avatars/gaz.png",
    "width": 256,
    "height": 256,
    "alt": "Gaz character avatar"
  },
  {
    "name": "Artery",
    "src": "/images/avatars/artery.webp",
    "original": "/images/avatars/artery.png",
    "width": 256,
    "height": 256,
    "alt": "Artery character avatar"
  },
  {
    "name": "Outrider",
    "src": "/images/avatars/outrider.webp",
    "original": "/images/avatars/outrider.png",
    "width": 256,
    "height": 256,
    "alt": "Outrider character avatar"
  },
  {
    "name": "Battery",
    "src": "/images/avatars/battery.webp",
    "original": "/images/avatars/battery.png",
    "width": 256,
    "height": 256,
    "alt": "Battery character avatar"
  },
  {
    "name": "Seraph",
    "src": "/images/avatars/seraph.webp",
    "original": "/images/avatars/seraph.png",
    "width": 256,
    "height": 256,
    "alt": "Seraph character avatar"
  },
  {
    "name": "Spectre",
    "src": "/images/avatars/spectre.webp",
    "original": "/images/avatars/spectre.png",
    "width": 256,
    "height": 256,
    "alt": "Spectre character avatar"
  },
  {
    "name": "Reaper",
    "src": "/images/avatars/reaper.webp",
    "original": "/images/avatars/reaper.png",
    "width": 256,
    "height": 256,
    "alt": "Reaper character avatar"
  },
  {
    "name": "Templar",
    "src": "/images/avatars/templar.webp",
    "original": "/images/avatars/templar.png",
    "width": 256,
    "height": 256,
    "alt": "Templar character avatar"
  },
  {
    "name": "Prophet",
    "src": "/images/avatars/prophet.webp",
    "original": "/images/avatars/prophet.png",
    "width": 256,
    "height": 256,
    "alt": "Prophet character avatar"
  },
  {
    "name": "Hidora Kai",
    "src": "/images/avatars/hidora-kai.webp",
    "original": "/images/avatars/hidora-kai.png",
    "width": 256,
    "height": 256,
    "alt": "Hidora Kai character avatar"
  }
] as const;

/** 22 portraits based on verified CODM skin references. */
export const referenceBasedCommunityAvatars = [
  {
    "name": "Siren",
    "skin": "Siren Song",
    "src": "/images/avatars/fresh-22/a/siren.webp",
    "small": "/images/avatars/fresh-22/a/siren-256.webp",
    "original": "/images/avatars/fresh-22/a/siren.png",
    "width": 512,
    "height": 512,
    "alt": "Siren — Siren Song character portrait"
  },
  {
    "name": "Tempest",
    "skin": "Swordbreaker",
    "src": "/images/avatars/fresh-22/a/tempest.webp",
    "small": "/images/avatars/fresh-22/a/tempest-256.webp",
    "original": "/images/avatars/fresh-22/a/tempest.png",
    "width": 512,
    "height": 512,
    "alt": "Tempest — Swordbreaker character portrait"
  },
  {
    "name": "Florence",
    "skin": "Night Terror",
    "src": "/images/avatars/fresh-22/a/florence.webp",
    "small": "/images/avatars/fresh-22/a/florence-256.webp",
    "original": "/images/avatars/fresh-22/a/florence.png",
    "width": 512,
    "height": 512,
    "alt": "Florence — Night Terror character portrait"
  },
  {
    "name": "Cipher",
    "skin": "Absolute Resolution",
    "src": "/images/avatars/fresh-22/a/cipher.webp",
    "small": "/images/avatars/fresh-22/a/cipher-256.webp",
    "original": "/images/avatars/fresh-22/a/cipher.png",
    "width": 512,
    "height": 512,
    "alt": "Cipher — Absolute Resolution character portrait"
  },
  {
    "name": "Foxtrot",
    "skin": "Deadly Fragments",
    "src": "/images/avatars/fresh-22/a/foxtrot.webp",
    "small": "/images/avatars/fresh-22/a/foxtrot-256.webp",
    "original": "/images/avatars/fresh-22/a/foxtrot.png",
    "width": 512,
    "height": 512,
    "alt": "Foxtrot — Deadly Fragments character portrait"
  },
  {
    "name": "Nyx",
    "skin": "Starstruck",
    "src": "/images/avatars/fresh-22/a/nyx.webp",
    "small": "/images/avatars/fresh-22/a/nyx-256.webp",
    "original": "/images/avatars/fresh-22/a/nyx.png",
    "width": 512,
    "height": 512,
    "alt": "Nyx — Starstruck character portrait"
  },
  {
    "name": "Dark Shepherd",
    "skin": "Phantom",
    "src": "/images/avatars/fresh-22/b/dark-shepherd-phantom.webp",
    "small": "/images/avatars/fresh-22/b/dark-shepherd-phantom-256.webp",
    "original": "/images/avatars/fresh-22/b/dark-shepherd-phantom.png",
    "width": 512,
    "height": 512,
    "alt": "Dark Shepherd — Phantom character portrait"
  },
  {
    "name": "Gunzo",
    "skin": "404 Not Clowned",
    "src": "/images/avatars/fresh-22/b/gunzo-404-not-clowned.webp",
    "small": "/images/avatars/fresh-22/b/gunzo-404-not-clowned-256.webp",
    "original": "/images/avatars/fresh-22/b/gunzo-404-not-clowned.png",
    "width": 512,
    "height": 512,
    "alt": "Gunzo — 404 Not Clowned character portrait"
  },
  {
    "name": "Killgore",
    "skin": "Dissidence",
    "src": "/images/avatars/fresh-22/b/killgore-dissidence.webp",
    "small": "/images/avatars/fresh-22/b/killgore-dissidence-256.webp",
    "original": "/images/avatars/fresh-22/b/killgore-dissidence.png",
    "width": 512,
    "height": 512,
    "alt": "Killgore — Dissidence character portrait"
  },
  {
    "name": "Keegan",
    "skin": "The Chariot",
    "src": "/images/avatars/fresh-22/b/keegan-the-chariot.webp",
    "small": "/images/avatars/fresh-22/b/keegan-the-chariot-256.webp",
    "original": "/images/avatars/fresh-22/b/keegan-the-chariot.png",
    "width": 512,
    "height": 512,
    "alt": "Keegan — The Chariot character portrait"
  },
  {
    "name": "Kestrel",
    "skin": "Coefficient",
    "src": "/images/avatars/fresh-22/b/kestrel-coefficient.webp",
    "small": "/images/avatars/fresh-22/b/kestrel-coefficient-256.webp",
    "original": "/images/avatars/fresh-22/b/kestrel-coefficient.png",
    "width": 512,
    "height": 512,
    "alt": "Kestrel — Coefficient character portrait"
  },
  {
    "name": "Kryptis",
    "skin": "Refraction",
    "src": "/images/avatars/fresh-22/b/kryptis-refraction.webp",
    "small": "/images/avatars/fresh-22/b/kryptis-refraction-256.webp",
    "original": "/images/avatars/fresh-22/b/kryptis-refraction.png",
    "width": 512,
    "height": 512,
    "alt": "Kryptis — Refraction character portrait"
  },
  {
    "name": "Sophia",
    "skin": "Dawn's Renewal (base)",
    "src": "/images/avatars/fresh-22/c/sophia.webp",
    "small": "/images/avatars/fresh-22/c/sophia-256.webp",
    "original": "/images/avatars/fresh-22/c/sophia.png",
    "width": 512,
    "height": 512,
    "alt": "Sophia — Dawn's Renewal (base) character portrait"
  },
  {
    "name": "Alias",
    "skin": "Roboticist",
    "src": "/images/avatars/fresh-22/c/alias.webp",
    "small": "/images/avatars/fresh-22/c/alias-256.webp",
    "original": "/images/avatars/fresh-22/c/alias.png",
    "width": 512,
    "height": 512,
    "alt": "Alias — Roboticist character portrait"
  },
  {
    "name": "Sparrowhawk",
    "skin": "Moonlight Vengeance",
    "src": "/images/avatars/fresh-22/c/sparrowhawk.webp",
    "small": "/images/avatars/fresh-22/c/sparrowhawk-256.webp",
    "original": "/images/avatars/fresh-22/c/sparrowhawk.png",
    "width": 512,
    "height": 512,
    "alt": "Sparrowhawk — Moonlight Vengeance character portrait"
  },
  {
    "name": "Dusk",
    "skin": "Frost Cinder",
    "src": "/images/avatars/fresh-22/c/dusk.webp",
    "small": "/images/avatars/fresh-22/c/dusk-256.webp",
    "original": "/images/avatars/fresh-22/c/dusk.png",
    "width": 512,
    "height": 512,
    "alt": "Dusk — Frost Cinder character portrait"
  },
  {
    "name": "Vagr Modir",
    "skin": "Going Dark",
    "src": "/images/avatars/fresh-22/c/vagr-modir.webp",
    "small": "/images/avatars/fresh-22/c/vagr-modir-256.webp",
    "original": "/images/avatars/fresh-22/c/vagr-modir.png",
    "width": 512,
    "height": 512,
    "alt": "Vagr Modir — Going Dark character portrait"
  },
  {
    "name": "Stitch",
    "skin": "The Butcher of Zordaya",
    "src": "/images/avatars/fresh-22/d/stitch-butcher-of-zordaya.webp",
    "small": "/images/avatars/fresh-22/d/stitch-butcher-of-zordaya-256.webp",
    "original": "/images/avatars/fresh-22/d/stitch-butcher-of-zordaya.png",
    "width": 512,
    "height": 512,
    "alt": "Stitch — The Butcher of Zordaya character portrait"
  },
  {
    "name": "Naga",
    "skin": "Demon Armor",
    "src": "/images/avatars/fresh-22/d/naga-demon-armor.webp",
    "small": "/images/avatars/fresh-22/d/naga-demon-armor-256.webp",
    "original": "/images/avatars/fresh-22/d/naga-demon-armor.png",
    "width": 512,
    "height": 512,
    "alt": "Naga — Demon Armor character portrait"
  },
  {
    "name": "Wicht Warden",
    "skin": "Horsemen: Pestilence",
    "src": "/images/avatars/fresh-22/d/wicht-warden-pestilence.webp",
    "small": "/images/avatars/fresh-22/d/wicht-warden-pestilence-256.webp",
    "original": "/images/avatars/fresh-22/d/wicht-warden-pestilence.png",
    "width": 512,
    "height": 512,
    "alt": "Wicht Warden — Horsemen: Pestilence character portrait"
  },
  {
    "name": "Mace",
    "skin": "Final Guard",
    "src": "/images/avatars/fresh-22/d/mace-final-guard.webp",
    "small": "/images/avatars/fresh-22/d/mace-final-guard-256.webp",
    "original": "/images/avatars/fresh-22/d/mace-final-guard.png",
    "width": 512,
    "height": 512,
    "alt": "Mace — Final Guard character portrait"
  },
  {
    "name": "Dame",
    "skin": "Break of Dawn",
    "src": "/images/avatars/fresh-22/d/dame-break-of-dawn.webp",
    "small": "/images/avatars/fresh-22/d/dame-break-of-dawn-256.webp",
    "original": "/images/avatars/fresh-22/d/dame-break-of-dawn.png",
    "width": 512,
    "height": 512,
    "alt": "Dame — Break of Dawn character portrait"
  }
] as const;
