import Image from "next/image";
import type { Story } from "@/lib/league";
import { newsPage } from "@/content/news";
import { Icon } from "../Icons";

/** What a list of stories needs, worked out on the server so the browser gets no data module. */
export type StoryItem = Pick<Story, "slug" | "title" | "category" | "excerpt" | "cover"> & { date: string; minutes: number };

function Meta({ story }: { story: StoryItem }) {
  return (
    <span className="nw-meta">
      <span className="nw-meta__cat">{story.category}</span>
      <span>{story.date}</span>
    </span>
  );
}

/** One story in a grid: cover, category and date, title, excerpt and reading time. */
export function StoryCard({ story, style }: { story: StoryItem; style?: React.CSSProperties }) {
  return (
    <a className="nw-card" href={`/news/${story.slug}`} style={style}>
      <span className="nw-card__cover">
        <Image src={story.cover.src} alt="" width={story.cover.width} height={story.cover.height} sizes="(min-width: 1100px) 30vw, (min-width: 640px) 46vw, 92vw" />
      </span>
      <span className="nw-card__body">
        <Meta story={story} />
        <strong className="nw-card__title">{story.title}</strong>
        <span className="nw-card__excerpt">{story.excerpt}</span>
        <span className="nw-card__foot">
          {newsPage.minutes(story.minutes)}
          <Icon name="arrow" size={16} />
        </span>
      </span>
    </a>
  );
}

/** The lead story: a wide cover beside a large title. */
export function StoryFeature({ story }: { story: StoryItem }) {
  return (
    <a className="tile nw-feature" href={`/news/${story.slug}`}>
      <span className="nw-feature__cover">
        <Image src={story.cover.src} alt={story.cover.alt} width={story.cover.width} height={story.cover.height} sizes="(min-width: 900px) 58vw, 92vw" priority />
      </span>
      <span className="nw-feature__body">
        <span className="nw-feature__top">
          <span className="label">
            <i />
            {newsPage.latest}
          </span>
          <Meta story={story} />
        </span>
        <span>
          <strong className="nw-feature__title">{story.title}</strong>
          <span className="nw-feature__excerpt">{story.excerpt}</span>
        </span>
        <span className="btn-ghost nw-feature__cta">
          {newsPage.read}
          <Icon name="arrow" size={16} />
        </span>
      </span>
    </a>
  );
}
