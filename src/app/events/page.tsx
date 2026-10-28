import type { Metadata } from "next";
import EventArchive, { UpcomingEvents } from "@/components/events/EventArchive";
import EventStandings from "@/components/events/EventStandings";
import EventsIntro from "@/components/events/EventsIntro";
import Footer from "@/components/footer/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import "./events.css";
import { featuredEvent } from "@/lib/league";

export const metadata: Metadata = {
  title: "Events · MGL",
  description: "Live standings while an event runs, and every final table from MGL's seasons, mixed events and partner events.",
};

export default function EventsPage() {
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <EventsIntro />
        <UpcomingEvents />
        <EventStandings event={featuredEvent} link />
        <EventArchive />
      </main>
      <Footer />
    </div>
  );
}
