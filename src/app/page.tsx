import type { Metadata } from "next";
import About from "@/components/about/About";
import Fantasy from "@/components/fantasy/Fantasy";
import Faq from "@/components/faq/Faq";
import Footer from "@/components/footer/Footer";
import Hero from "@/components/hero/Hero";
import Honours from "@/components/honours/Honours";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import Standings from "@/components/standings/Standings";
import { site } from "@/content/site";
import { getSettings } from "@/lib/settings";
import { MGL_ORIGIN } from "@/lib/site-url.mjs";

export const metadata: Metadata = {
  title: `${site.name} (${site.short}) | African CODM Battle Royale`,
  alternates: { canonical: "/" },
};

async function LeagueStructuredData() {
  const { discord, socials } = await getSettings();
  const url = `${MGL_ORIGIN}/`;
  const organizationId = `${url}#organization`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: site.name,
        alternateName: site.short,
        url,
        description: site.description,
        logo: `${url}apple-icon.png`,
        sameAs: [discord, ...Object.values(socials)].filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: site.name,
        alternateName: site.short,
        url,
        inLanguage: "en",
        publisher: { "@id": organizationId },
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export default function Home() {
  return (
    <div className="page">
      <LeagueStructuredData />
      <SmoothScroll />
      <Nav />
      <main>
        <Hero />
        <About />
        <Standings />
        <Honours />
        <Fantasy />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
