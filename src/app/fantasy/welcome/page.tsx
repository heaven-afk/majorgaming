import type { Metadata } from "next";
import { Welcome } from "@/components/fantasy/game/AuthForms";
import { AuthCard } from "@/components/fantasy/game/Chrome";
import { fantasyPage } from "@/content/fantasy";

export const metadata: Metadata = { title: "Welcome · MGL Fantasy", robots: { index: false } };

/** Where the confirmation and reset emails' links land. */
export default function WelcomePage() {
  return (
    <>
      <AuthCard title={fantasyPage.auth.login.title}>
        <Welcome />
      </AuthCard>
    </>
  );
}
