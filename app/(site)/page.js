"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FaLeaf,
  FaClock,
  FaUsers,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaHandsHelping,
  FaHeart,
  FaMapMarkedAlt,
} from "react-icons/fa";

export default function Home() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselPosition, setCarouselPosition] = useState(0);

  const heroImages = [
    {
      url: "/image/g1.jpg",
      alt: "Lush tea fields at sunrise",
    },
    {
      url: "/image/g2.jpg",
      alt: "Green tea plantation",
    },
    {
      url: "/image/img13.jpg",
      alt: "Lush tea fields at sunrise",
    },
    {
      url: "/image/g3.jpg",
      alt: "Tea tasting session",
    },
  ];

  // Auto-advance slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + heroImages.length) % heroImages.length
    );
  };

  // Carousel scroll functions
  const scrollCarouselLeft = () => {
    setCarouselPosition((prev) => Math.min(prev + 350, 0));
  };

  const scrollCarouselRight = () => {
    setCarouselPosition((prev) => prev - 350);
  };

  // Auto-scroll carousel
  useEffect(() => {
    const autoScroll = setInterval(() => {
      setCarouselPosition((prev) => {
        // Calculate max scroll (negative value)
        const maxScroll = -((13 * 2) * (320 + 24)); // 13 images * 2 duplicates * (width + gap)
        // Reset to 0 when reaching halfway point for seamless loop
        if (prev <= maxScroll / 2) {
          return 0;
        }
        return prev - 1; // Scroll 1px at a time for smooth animation
      });
    }, 20); // Update every 20ms for smooth 60fps animation

    return () => clearInterval(autoScroll);
  }, []);

  const features = [
    {
      icon: FaMapMarkedAlt,
      description: "The only interactive tea experience in Southern Sri Lanka",
      gradient: "linear-gradient(135deg, #767014, #C5BF81)",
    },
    {
      icon: FaHandsHelping,
      description: "Hands-on tea making & tasting sessions",
      gradient: "linear-gradient(135deg, #C5BF81, #767014)",
    },
    {
      icon: FaLeaf,
      description: "Build-Your-Own Tea Library — personalised blends",
      gradient: "linear-gradient(135deg, #767014, #C5BF81)",
    },
    {
      icon: FaStar,
      description: "Premium tea café serving curated Ceylon teas",
      gradient: "linear-gradient(135deg, #C5BF81, #767014)",
    },
    {
      icon: FaHeart,
      description: "Perfect for families, couples, and cultural travellers",
      gradient: "linear-gradient(135deg, #767014, #C5BF81)",
    },
    {
      icon: FaClock,
      description: "Quick, curated, high-value experience — no full-day travel required",
      gradient: "linear-gradient(135deg, #C5BF81, #767014)",
    },
  ];

  return (
    <>
      <Header />
      <main>
        {/* Hero Section with Image Slider */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Image Slider Background */}
          <div className="absolute inset-0 -z-10">
            {heroImages.map((image, index) => (
              <div
                key={image.url}
                className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                aria-hidden={index !== currentSlide}
              >
                <div className="relative h-full w-full">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    priority={index === 0}
                    sizes="100vw"
                    className="object-cover"
                    quality={100}
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
                </div>
              </div>
            ))}
          </div>

          {/* Slider Controls */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-colors duration-200"
            aria-label="Previous slide"
          >
            <FaChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white p-3 rounded-full transition-colors duration-200"
            aria-label="Next slide"
          >
            <FaChevronRight className="h-6 w-6" />
          </button>

          {/* Slider Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentSlide
                  ? "bg-white w-8"
                  : "bg-white/50 hover:bg-white/75"
                  }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Hero Content */}
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center relative z-10">
            <div className="space-y-8 fade-in">
              <div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 max-w-4xl mx-auto leading-tight drop-shadow-lg">
                  “Don’t Just Drink Ceylon Tea - {" "}
                  <span className="text-yellow-300">Experience It</span>”
                </h1>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-12 max-w-2xl mx-auto drop-shadow-md">
                Journey into the art, heritage, and flavour of Sri Lanka’s world-famous tea.
                Craft your own blend, taste teas from every region, and immerse yourself in a hands-on experience unlike anything in the South.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  asChild
                  size="lg"
                  className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 transition-colors duration-200 justify-center font-bold rounded-full"
                >
                  <Link href="/book">Book Your Experience</Link>
                </Button>
                {/* <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/50 backdrop-blur-sm transition-colors duration-200"
                >
                  <Link href="/gallery">View Gallery</Link>
                </Button> */}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-gradient-to-b from-background to-secondary/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4 text-primary">
                Why Choose Us
              </h2>
              <p className="max-w-3xl mx-auto" style={{ color: '#1e1e0bff' }}>
                Discover Sri Lanka&apos;s Tea Story - in the Heart of Galle
              </p>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                The Ceylon Tea Experience (TCTE) brings the magic of the tea highlands to the Southern Coast.
                More than a cafe, we are an interactive tea journey where you learn, create, and taste.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  className="border-2 hover:border-primary transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white/95 backdrop-blur-sm group overflow-hidden"
                  style={{ borderColor: '#C5BF81' }}
                >
                  <CardContent className="pt-8 text-center relative">
                    <div 
                      className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ background: feature.gradient }}
                    >
                      <feature.icon className="h-10 w-10" style={{ color: '#ffffff' }} />
                    </div>
                    <p className="text-base leading-relaxed px-2" style={{ color: '#000000' }}>
                      {feature.description}
                    </p>
                    {/* Decorative gradient line */}
                    {/* <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div> */}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Quick Services Preview */}
        <section className="py-20 bg-gradient-to-br from-white via-secondary/5 to-primary/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-in-up">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4 text-primary">
                Our Experience
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-center">
                At TCTE, every visitor becomes part of the tea-making process.
              </p><br />
              <p className="text-muted-foreground max-w-2xl mx-auto text-center">
                From plucking leaves and rolling your own tea, to crafting a personalised blend with herbs and flavours, the experience is designed to be immersive, educational, and unforgettable.
              </p><br />
              <p className="text-muted-foreground max-w-2xl mx-auto text-center">
                Whether you have 30 minutes or two hours, you walk away with a deeper appreciation of the craftsmanship behind Ceylon Tea — and a blend you can call your own.
              </p>
            </div>

            {/* Scrolling Images Carousel */}
            <div className="mb-16 overflow-hidden relative">
              {/* Left Arrow */}
              <button
                onClick={scrollCarouselLeft}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-white p-3 rounded-full transition-colors duration-200 shadow-lg"
                aria-label="Scroll left"
              >
                <FaChevronLeft className="h-6 w-6" />
              </button>

              {/* Right Arrow */}
              <button
                onClick={scrollCarouselRight}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-primary/80 hover:bg-primary text-white p-3 rounded-full transition-colors duration-200 shadow-lg"
                aria-label="Scroll right"
              >
                <FaChevronRight className="h-6 w-6" />
              </button>

              <div
                className="flex gap-6 w-fit"
                style={{ transform: `translateX(${carouselPosition}px)` }}
              >
                {/* Duplicate the images twice for seamless loop */}
                {[...Array(2)].map((_, duplicateIndex) => (
                  <div key={duplicateIndex} className="flex gap-6">
                    {[
                      "/image/PluckingTour.jpg",
                      "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
                      "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=800&q=80",
                      "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80",
                      "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80",
                      "/image/img1.jpg",
                      "/image/img2.jpg",
                      "/image/img3.jpg",
                      "/image/img5.jpg",
                      "/image/img6.jpg",
                      "/image/img7.jpg",
                      "/image/img8.jpg",
                      "/image/img9.jpg",

                    ].map((image, index) => (
                      <div
                        key={`${duplicateIndex}-${index}`}
                        className="relative flex-shrink-0 w-80 h-100 rounded-xl overflow-hidden shadow-lg border-2 border-primary/20 hover:border-primary/50 transition-all duration-300"
                      >
                        <Image
                          src={image}
                          alt={`Tea experience ${index + 1}`}
                          fill
                          sizes="320px"
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              }}
            >
              {[
                {
                  name: "Plucking Tour",
                  image: "/image/PluckingTour.jpg",
                  price: "From $45",
                },
                {
                  name: "Black Tea Experience",
                  image:
                    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80",
                  price: "From $55",
                },
                {
                  name: "Green Tea Experience",
                  image:
                    "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&q=80",
                  price: "From $55",
                },
                {
                  name: "Tea Tasting Session",
                  image:
                    "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&q=80",
                  price: "From $35",
                },
              ].map((service, index) => (
                <div
                  key={index}
                  className="group overflow-hidden rounded-3xl border-4 border-primary/20 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-300 hover:border-primary/50 hover:shadow-xl"
                >
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-xl font-bold text-white drop-shadow-lg mb-1">
                        {service.name}
                      </p>
                      <p className="text-sm font-semibold text-secondary drop-shadow bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full inline-block">
                        {service.price}
                      </p>
                    </div>
                  </div>
                  <div className="pt-6 px-6 pb-6">
                    <p className="text-sm text-muted-foreground mb-6">
                      Discover the unique journey of tea production with expert
                      guides
                    </p>
                    <Button
                      asChild
                      variant="link"
                      className="h-auto p-0 text-primary font-semibold transition-colors duration-200 hover:text-primary/80"
                    >
                      <Link
                        href="/services"
                        className="flex items-center gap-1"
                      >
                        Learn More
                        <span>→</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div> */}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-4xl mx-auto space-y-8 fade-in-up">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold mb-6 drop-shadow-xl text-white">
                  Ready to Discover Ceylon Tea?
                </h2>
              </div>
              <p className="text-lg md:text-2xl mb-12 opacity-95 drop-shadow-lg max-w-3xl mx-auto">
                Create. Taste. Explore. <br/>
                Your journey into Sri Lanka’s most iconic heritage begins here.
              </p>

              <div>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="text-base sm:text-lg md:text-xl px-6 py-4 sm:px-8 sm:py-6 md:px-12 md:py-8 bg-white text-primary hover:bg-white/90 font-bold rounded-full transition-colors duration-300"
                >
                  <Link href="/book">Reserve Your Experience</Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="mt-16 flex flex-wrap justify-center gap-12 text-base opacity-95">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/20 transition-colors duration-200">
                  <FaStar className="text-secondary text-xl" />
                  <span className="font-semibold">5-Star Rated</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/20 transition-colors duration-200">
                  <FaUsers className="text-secondary text-xl" />
                  <span className="font-semibold">1000+ Happy Guests</span>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full hover:bg-white/20 transition-colors duration-200">
                  <FaLeaf className="text-secondary text-xl" />
                  <span className="font-semibold">100% Organic</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
