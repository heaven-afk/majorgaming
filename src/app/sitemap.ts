import type { MetadataRoute } from "next";
import { getLeague } from "@/lib/league";
import { MGL_ORIGIN } from "@/lib/site-url.mjs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { teams, events, stories } = await getLeague();
  const paths = [
    "/", "/teams", "/events", "/news", "/staff", "/fantasy",
    ...teams.map(team => `/teams/${team.slug}`),
    ...events.map(event => `/events/${event.slug}`),
    ...stories.map(story => `/news/${story.slug}`),
  ];
  return paths.map(path => ({ url: new URL(path, MGL_ORIGIN).href }));
}
