import type { Metadata } from "next";
import Footer from "@/components/footer/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import TeamDirectory from "@/components/teams/TeamDirectory";
import TeamsIntro from "@/components/teams/TeamsIntro";
import { getLeague } from "@/lib/league";

export const metadata: Metadata = {
  title: "Teams · MGL",
  description: "The squads registered with MGL, tier by tier, with their lineups, managers and the events they have played.",
};

export default async function TeamsPage() {
  const { activeTeams } = await getLeague();
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <TeamsIntro />
        <TeamDirectory teams={activeTeams} />
      </main>
      <Footer />
    </div>
  );
}
