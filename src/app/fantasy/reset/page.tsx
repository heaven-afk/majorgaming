import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "@/components/fantasy/game/AuthForms";
import { AuthCard } from "@/components/fantasy/game/Chrome";
import { fantasyPage } from "@/content/fantasy";
import { requireManager } from "@/lib/fantasy/session";

export const metadata: Metadata = { title: "New password · MGL Fantasy" };

/** Reached from the reset email's link, which signs them in first. */
async function Guard() {
  await requireManager("/fantasy/reset");
  return null;
}

export default function ResetPage() {
  return (
    <>
      <Suspense>
        <Guard />
      </Suspense>
      <AuthCard title={fantasyPage.auth.reset.title}>
        <ResetForm />
      </AuthCard>
    </>
  );
}
