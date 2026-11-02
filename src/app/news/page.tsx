import type { Metadata } from "next";
import Footer from "@/components/footer/Footer";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import NewsFeed from "@/components/news/NewsFeed";
import Scene from "@/components/motion/Scene";
import { newsPage } from "@/content/news";
import { formatDate, getLeague, readingTime } from "@/lib/league";

export const metadata: Metadata = {
  title: "News · MGL",
  description: "Announcements, season recaps and features from MGL, Africa's ranked CODM Battle Royale league.",
};

export default async function NewsPage() {
  const { stories } = await getLeague();
  const items = stories.map((s) => ({
    slug: s.slug,
    title: s.title,
    category: s.category,
    excerpt: s.excerpt,
    cover: s.cover,
    date: formatDate(s.date),
    minutes: readingTime(s),
  }));

  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Scene className="tile nw-intro" aria-labelledby="news-title">
          <div data-rise>
            <span className="label">
              <i />
              {newsPage.label}
            </span>
            <h1 className="ev-intro__title" id="news-title">
              {newsPage.title.before} <em>{newsPage.title.accent}</em>
            </h1>
          </div>
          <p className="ev-intro__lede" data-rise="1">
            {newsPage.lede}
          </p>
        </Scene>
        <NewsFeed stories={items} />
      </main>
      <Footer />
    </div>
  );
}
