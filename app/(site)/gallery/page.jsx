"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { FaImages } from "react-icons/fa";

export default function Gallery() {
  const [isLoading, setIsLoading] = useState(true);

  const images = [
    {
      id: 1,
      src: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=1200&q=80",
      alt: "Tea fields at sunrise",
      category: "Tea Fields",
    },
    {
      id: 2,
      src: "/image/img6.jpg",
      alt: "Guided tea plucking tour",
      category: "Plucking Tour",
    },
    {
      id: 3,
      src: "https://images.unsplash.com/photo-1558160074-4d7d8bdf4256?auto=format&fit=crop&w=1200&q=80",
      alt: "Tea tasting setup with cups",
      category: "Tasting Session",
    },
    {
      id: 4,
      src: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=1200&q=80",
      alt: "Rolling hills of green tea",
      category: "Tea Fields",
    },
    {
      id: 5,
      src: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80",
      alt: "Processing fresh black tea leaves",
      category: "Processing",
    },
    {
      id: 6,
      src: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=1200&q=80",
      alt: "Elegant tea cup arrangement",
      category: "Tasting Session",
    },
    {
      id: 7,
      src: "/image/img5.jpg",
      alt: "Fresh tea leaves close-up",
      category: "Tea Fields",
    },
    {
      id: 8,
      src: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=1200&q=80",
      alt: "Tea ceremony setup with kettle",
      category: "Tasting Session",
    },
    {
      id: 9,
      src: "/image/img9.jpg",
      alt: "Panoramic tea estate view",
      category: "Tea Fields",
    },
    {
      id: 10,
      src: "/image/img2.jpg",
      alt: "Traditional wooden tea house",
      category: "Heritage",
    },
    {
      id: 11,
      src: "/image/img8.jpg",
      alt: "Tea plantation workers harvesting",
      category: "Plucking Tour",
    },
    {
      id: 12,
      src: "https://images.unsplash.com/photo-1464306208223-e0b4495a5553?auto=format&fit=crop&w=1200&q=80",
      alt: "Assortment of loose leaf teas",
      category: "Tea Varietals",
    },
    {
      id: 13,
      src: "/image/img3.jpg",
      alt: "Assortment of loose leaf teas",
      category: "Tea Varietals",
    },
    {
      id: 14,
      src: "/image/img1.jpg",
      alt: "Assortment of loose leaf teas",
      category: "Tea Varietals",
    },
  ];

  return (
    <>
      {isLoading && <LoadingScreen onComplete={() => setIsLoading(false)} />}
      <Header />
      <FloatingActionButtons />
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="py-28 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #767014 0%, #C5BF81 50%, #767014 100%)' }}>
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)' }} />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full translate-y-1/2 -translate-x-1/2" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }} />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-block mb-6">
              <FaImages className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Experience the Journey in Images
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              A glimpse into the craftsmanship, creativity, and flavours behind The Ceylon Tea Experience.
            </p>
          </div>
        </section>

        {/* Gallery Grid */}
        <section className="py-20 bg-gradient-to-b from-background via-secondary/5 to-primary/5 relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            {/* <div className="text-center mb-12">
               <h2 className="text-3xl font-serif font-bold mb-4 text-primary">
                Moments Captured in Time
              </h2> 
              <p className="text-muted-foreground max-w-2xl text-xl mx-auto">
                A glimpse into the craftsmanship, creativity, and flavours behind The Ceylon Tea Experience.
              </p>
            </div> */}

            <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              }}
            >
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="group relative cursor-pointer overflow-hidden rounded-3xl border-4 border-primary/20 bg-white/90 backdrop-blur-sm shadow-lg"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                      priority={index < 3}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100" />
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 translate-y-full p-6 group-hover:translate-y-0">
                      <div className="space-y-2">
                        <p className="text-white font-bold text-lg drop-shadow-lg">
                          {image.alt}
                        </p>
                        <p className="inline-block rounded-full bg-primary/90 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur border border-white/20">
                          {image.category}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
