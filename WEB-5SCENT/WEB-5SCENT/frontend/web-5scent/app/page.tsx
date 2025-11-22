import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import SearchBar from "@/components/SearchBar";
import BestSellerSection from "@/components/BestSellerSection";
import FeatureHighlights from "@/components/FeatureHighlights";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <SearchBar />
      <BestSellerSection />
      <FeatureHighlights />
      {/* Black line separator before footer */}
      <div className="border-t-2 border-black"></div>
      <Footer />
    </main>
  );
}
