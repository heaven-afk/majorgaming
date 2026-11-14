"use client";

import Image from "next/image";
import { useState } from "react";
import { Crest } from "../about/Crest";

export function StandingsMark({ name, logo, size, tone }: { name: string; logo?: string; size: number; tone?: number }) {
  const [failed, setFailed] = useState<string>();
  if (!logo || logo === failed) return <Crest name={name} size={size} tone={tone} />;
  return <Image src={logo} alt="" width={size} height={size} unoptimized onError={() => setFailed(logo)} style={{ flexShrink: 0, objectFit: "contain" }} />;
}
