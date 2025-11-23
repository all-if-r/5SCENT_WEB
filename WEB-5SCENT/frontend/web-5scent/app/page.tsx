import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import BestSellerSection from "@/components/BestSellerSection";
import FeatureHighlights from "@/components/FeatureHighlights";
import Footer from "@/components/Footer";
import ScrollAnimated from "@/components/ScrollAnimated";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <ScrollAnimated direction="fade" delay={0.1}>
        <SearchBar />
      </ScrollAnimated>
      <ScrollAnimated direction="up" delay={0.2}>
        <BestSellerSection />
      </ScrollAnimated>
      <ScrollAnimated direction="up" delay={0.3}>
        <FeatureHighlights />
      </ScrollAnimated>
      {/* Black line separator before footer */}
      <div className="border-t-2 border-black"></div>
      <Footer />
    </main>
  );
}
