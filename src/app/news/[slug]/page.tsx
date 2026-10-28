import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Mark } from "@/components/brand/Mark";
import Footer from "@/components/footer/Footer";
import { Icon } from "@/components/Icons";
import Scene from "@/components/motion/Scene";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import ShareLink from "@/components/news/ShareLink";
import { StoryCard } from "@/components/news/StoryCard";
import { newsPage } from "@/content/news";
import { site } from "@/content/site";
import { formatDate, readingTime, stories, storyBySlug } from "@/lib/league";
import type { Block } from "@/data/types";

export function generateStaticParams() {
  return stories.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/news/[slug]">): Promise<Metadata> {
  const story = storyBySlug((await params).slug);
  if (!story) return {};
  return { title: `${story.title} · News · MGL`, description: story.excerpt, openGraph: { images: [story.cover.src] } };
}

/**
 * One story: headline, cover, the story in a readable column with a share rail beside it, and
 * three more stories. The story streams in behind a placeholder prebuilt stories never show.
 */
export default function StoryPage({ params }: PageProps<"/news/[slug]">) {
  return (
    <div className="page">
      <SmoothScroll />
      <Nav />
      <main>
        <Suspense fallback={<Placeholder />}>
          <StoryContent params={params} />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

function Placeholder() {
  return (
    <div className="tile ev-season ev-placeholder" aria-busy="true" aria-label="Loading story">
      <i />
      <i />
      <i />
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if ("p" in block) return <p>{block.p}</p>;
  if ("h" in block) return <h2>{block.h}</h2>;
  if ("quote" in block)
    return (
      <blockquote>
        <p>{block.quote}</p>
        {block.by && <cite>{block.by}</cite>}
      </blockquote>
    );
  return (
    <ul>
      {block.list.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

async function StoryContent({ params }: { params: PageProps<"/news/[slug]">["params"] }) {
  const story = storyBySlug((await params).slug);
  if (!story) notFound();

  const copy = newsPage.story;
  const more = stories
    .filter((s) => s.slug !== story.slug)
    .slice(0, 3)
    .map((s) => ({ slug: s.slug, title: s.title, category: s.category, excerpt: s.excerpt, cover: s.cover, date: formatDate(s.date), minutes: readingTime(s) }));

  return (
    <>
      <article className="tile nw-story" aria-labelledby="story-title">
        <Scene className="nw-story__head">
          <div className="nw-story__top" data-rise>
            <Link className="ev-season__back" href="/news">
              <Icon name="arrow" size={16} className="ev-season__back-icon" />
              {copy.back}
            </Link>
            <span className="nw-meta">
              <span className="nw-meta__cat">{story.category}</span>
              <time dateTime={story.date}>{formatDate(story.date)}</time>
              <span>{newsPage.minutes(readingTime(story))}</span>
            </span>
          </div>
          <h1 className="nw-story__title" id="story-title" data-rise="1">
            {story.title}
          </h1>
          <p className="nw-story__lede" data-rise="2">
            {story.excerpt}
          </p>
          <p className="nw-story__byline" data-rise="2">
            <span className="nw-story__mark">
              <Mark size={20} tone="#f4f2ee" />
            </span>
            <span>
              <strong>{story.author.name}</strong>
              <small>{story.author.role}</small>
            </span>
          </p>
        </Scene>

        <figure className="nw-story__cover">
          <Image src={story.cover.src} alt={story.cover.alt} width={story.cover.width} height={story.cover.height} sizes="(min-width: 1440px) 1360px, 96vw" priority />
        </figure>

        <div className="nw-story__layout">
          <aside className="nw-story__aside" aria-label={copy.share}>
            <span>{copy.share}</span>
            <ShareLink title={story.title} />
            <a className="btn-ghost" href={site.discord} target="_blank" rel="noreferrer">
              <Icon name="discord" size={16} />
              {copy.discord}
            </a>
          </aside>
          <div className="nw-prose">
            {story.body.map((b, i) => (
              <BlockView key={i} block={b} />
            ))}
          </div>
        </div>
      </article>

      {more.length > 0 && (
        <Scene className="nw-more" aria-labelledby="more-title">
          <header className="sec-head" data-rise>
            <h2 className="sec-title" id="more-title">
              {copy.more.before} <em>{copy.more.accent}</em>
            </h2>
          </header>
          <ul className="nw-grid">
            {more.map((s, i) => (
              <li key={s.slug} data-rise={i * 0.5}>
                <StoryCard story={s} />
              </li>
            ))}
          </ul>
        </Scene>
      )}
    </>
  );
}
