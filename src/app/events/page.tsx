import type { Metadata } from "next";
import EventArchive, { UpcomingEvents } from "@/components/events/EventArchive";
import EventStandings from "@/components/events/EventStandings";
import IndexResults from "@/components/events/IndexResults";
import EventsIntro from "@/components/events/EventsIntro";
import Footer from "@/components/footer/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import "./events.css";
import { getLeague } from "@/lib/league";

export const metadata: Metadata = {
  title: "Events · MGL",
  description: "Live standings while an event runs, and every final table from MGL's seasons, mixed events and partner events.",
};

export default async function EventsPage() {
  const { featuredEvent } = await getLeague();
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <EventsIntro />
        <UpcomingEvents />
        <IndexResults slug={featuredEvent.slug} live={featuredEvent.status === "live"} compact>
          <EventStandings event={featuredEvent} link />
        </IndexResults>
        <EventArchive />
      </main>
      <Footer />
    </div>
  );
}
