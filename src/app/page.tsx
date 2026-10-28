import About from "@/components/about/About";
import Fantasy from "@/components/fantasy/Fantasy";
import Faq from "@/components/faq/Faq";
import Footer from "@/components/footer/Footer";
import Hero from "@/components/hero/Hero";
import Honours from "@/components/honours/Honours";
import SmoothScroll from "@/components/motion/SmoothScroll";
import Nav from "@/components/Nav";
import Standings from "@/components/standings/Standings";

export default function Home() {
  return (
    <div className="page">
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
