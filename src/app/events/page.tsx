import type { Metadata } from "next";
import EventArchive, { UpcomingEvents } from "@/components/events/EventArchive";
import EventStandings from "@/components/events/EventStandings";
import IndexResults from "@/components/events/IndexResults";
import EventsIntro from "@/components/events/EventsIntro";
import Footer from "@/components/footer/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import { eventsPage } from "@/content/site";
import "./events.css";
import { getLeague } from "@/lib/league";

export const metadata: Metadata = {
  title: "African CODM BR Rankings & Tournaments | Major Gaming League",
  alternates: { canonical: "/events" },
  description: eventsPage.description,
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
        <IndexResults slug={featuredEvent.slug} name={featuredEvent.name} live={featuredEvent.status === "live"} compact>
          <EventStandings event={featuredEvent} link />
        </IndexResults>
        <EventArchive />
      </main>
      <Footer />
    </div>
  );
}
