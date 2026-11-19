"use client";

import { useState } from "react";
import { Crest } from "../about/Crest";
import { LogoPlate } from "../LogoPlate";

export function StandingsMark({ name, logo, size, tone }: { name: string; logo?: string; size: number; tone?: number }) {
  const [failed, setFailed] = useState<string>();
  if (!logo || logo === failed) return <Crest name={name} size={size} tone={tone} />;
  return <LogoPlate src={logo} size={size} unoptimized onError={() => setFailed(logo)} />;
}
