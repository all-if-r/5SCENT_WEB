'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

// Get carousel images sorted alphabetically
const getCarouselImages = () => {
  const images = [
    '/carousel_image/Ara_1.png',
    '/carousel_image/Ara_2.png',
    '/carousel_image/hapis_1.png',
    '/carousel_image/hapis_2.png',
    '/carousel_image/lif_1.png',
    '/carousel_image/lif_2.png',
    '/carousel_image/rehan_1.png',
    '/carousel_image/rehan_2.png',
    '/carousel_image/ryan_1.png',
    '/carousel_image/ryan_2.png',
  ];
  return images.sort();
};

export default function Hero() {
  const images = getCarouselImages();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [indicatorBottom, setIndicatorBottom] = useState(80);
  const heroRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2500); // 2.5 seconds per slide

    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    const updateIndicatorPosition = () => {
      if (!heroRef.current || !ctaRef.current) return;
      const heroRect = heroRef.current.getBoundingClientRect();
      const ctaRect = ctaRef.current.getBoundingClientRect();
      const spaceToBottom = heroRect.bottom - ctaRect.bottom;
      const halfway = Math.max(48, spaceToBottom / 2);
      setIndicatorBottom(halfway);
    };

    updateIndicatorPosition();
    window.addEventListener('resize', updateIndicatorPosition);
    return () => window.removeEventListener('resize', updateIndicatorPosition);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <section ref={heroRef} className="relative h-[700px] w-full overflow-hidden bg-black">
      {/* Carousel Images - Smooth crossfade */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <Image
              src={image}
              alt={`Carousel slide ${index + 1}`}
              fill
              className="object-cover"
              priority={index === 0}
              unoptimized
            />
          </div>
        ))}
      </div>

      {/* Overlay Content - Centered vertically */}
      <div className="absolute inset-0 flex items-center justify-center z-20 px-4">
        <div className="text-center text-white px-4 max-w-3xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-header font-bold mb-4 leading-tight">
            Discover Your Signature Scent
          </h1>
          <p className="text-lg md:text-xl mb-8 text-gray-100 max-w-2xl mx-auto font-body">
            Experience luxury fragrances crafted for the modern connoisseur
          </p>
          <Link
            href="/products"
            ref={ctaRef}
            className="inline-block px-10 py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 transition-colors text-base font-body"
          >
            Shop Now
          </Link>
        </div>
      </div>

      {/* Carousel Indicators - Active pill + round inactive dots, centered lower in the hero */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 z-30"
        style={{ bottom: `${indicatorBottom}px` }}
      >
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all drop-shadow-sm ${
              index === currentIndex
                ? 'w-6 h-2.5 rounded-full bg-white'
                : 'w-3 h-3 rounded-full bg-white/70 hover:bg-white'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors z-30"
        aria-label="Previous slide"
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-6 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2.5 rounded-full transition-colors z-30"
        aria-label="Next slide"
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </section>
  );
}
