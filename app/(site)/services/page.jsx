"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Button } from "@/components/ui/button";
import { FaLeaf, FaClock, FaUsers, FaCheck, FaMugHot, FaShoppingCart, FaChalkboardTeacher, FaMoneyBillWave, FaConciergeBell } from "react-icons/fa";

export default function Services() {
  const [isLoading, setIsLoading] = useState(true);
  const services = [
    {
      id: "section-1",
      title: "Hand-Made Tea & Tasting Experience",
      subtitle: "A hands-on journey through the art of Ceylon Tea.",
      duration: "120–180 minutes",
      output: "Your own hand-made tea + tasting session",
      revenueModel: "Ticketed per-person experience",
      description: "In this guided experience, guests are invited to step into the role of a tea maker:",
      image: "/image/PluckingTour.jpg",
      features: [
        "Hand-pluck fresh tea leaves",
        "Roll and craft your own green or black tea",
        "Learn how leaf grade, region, and climate influence taste",
        "Compare teas from different terroirs through a curated tasting",
        "Take home a sample of the tea you made"
      ],
      perfectFor: [
        "Cultural travellers",
        "Families",
        "Schools and groups",
        "Tea enthusiasts",
        "Anyone curious about the craftsmanship behind Ceylon Tea"
      ],
    },
    {
      id: "section-2",
      title: "The Tea Library — Build Your Own Tea",
      subtitle: "Sri Lanka's first curated tea-blending bar — where you become the blender.",
      duration: "10–20 minutes",
      experienceType: "Self-guided with staff assistance",
      perfectForText: "Couples, honeymooners, families, gift-seekers, repeat travellers",
      revenueModel: "High-margin retail and custom blending",
      description: "The Tea Library is the heart of TCTE. Guests can create their own signature tea using:",
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
      features: [
        "A choice of regional base teas (Uva, Nuwara Eliya, Dimbula, Ruhuna, Kandy, Sabaragamuwa)",
        "A selection of herbs, flowers, spices, and natural flavours",
        "Custom jars and personalised labels"
      ],
      additionalFeatures: [
        "Name your tea",
        "Package it as a gift",
        "Save your recipe with us",
        "Reorder online after returning home — anywhere in the world"
      ],
      extraInfo: "A curated Catalog of Teas showcases the diversity of Sri Lankan terroirs — giving guests the experience of travelling across the island through flavour."
    },
    {
      id: "section-3",
      title: "Tea Café",
      subtitle: "A modern lifestyle café",
      description: "Designed as a calm, elegant space, it blends modern aesthetics with Sri Lankan warmth — ideal for relaxing after the experience or for casual walk-ins.",
      image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=800&q=80",
      features: [
        "Premium single-origin teas",
        "Signature tea cocktails / mocktails",
        "Artisan coffees",
        "Tea-infused desserts and savoury items",
        "Ceylon-style traditional pairings (Tea + Jaggery, Tea + Rotti, etc.)"
      ],
    },
    {
      id: "section-4",
      title: "E-Commerce & Airport Delivery",
      subtitle: "Take Ceylon Tea home with you",
      description: "Guests can reorder their personalised blends or choose from our catalog of teas through our online store.",
      image: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&q=80",
      features: [
        "Hotel delivery",
        "Airport pickup",
        "Global shipping options"
      ],
    },
    {
      id: "section-5",
      title: "Workshops & Group Bookings",
      subtitle: "Tailored packages for groups",
      description: "Customisable according to duration and group size.",
      image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=800&q=80",
      features: [
        "Tour groups",
        "Corporate teams",
        "Boutique hotels & resorts",
        "Educational institutions"
      ],
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
              <FaMugHot className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Our Services
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            {/* <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              Choose from our curated programs designed for every tea enthusiast
            </p> */}
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16 bg-gradient-to-b from-background to-secondary/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="space-y-12">
              {services.map((service, index) => (
                <div
                  key={service.id}
                  className="group overflow-hidden rounded-2xl border-2 bg-white shadow-lg transition-all duration-300 hover:shadow-2xl"
                  style={{ borderColor: '#C5BF81' }}
                >
                  <div className={`flex flex-col ${index % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
                    {/* Image Section */}
                    <div className="relative h-72 lg:h-auto lg:w-2/5 overflow-hidden">
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 40vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        priority={index === 0}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent lg:bg-gradient-to-r" />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 p-6 sm:p-8 lg:p-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
                          <span className="text-white font-bold">{index + 1}</span>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-serif font-bold" style={{ color: '#767014' }}>
                          {service.title}
                        </h3>
                      </div>
                      
                      {service.subtitle && (
                        <p className="text-lg font-medium mb-4" style={{ color: '#C5BF81' }}>
                          {service.subtitle}
                        </p>
                      )}

                      <p className="mb-6" style={{ color: '#000000', opacity: 0.85 }}>
                        {service.description}
                      </p>

                      {/* Features */}
                      <div className="mb-6">
                        <ul className="space-y-2">
                          {service.features.map((feature, featureIndex) => (
                            <li
                              key={featureIndex}
                              className="flex items-start gap-3"
                            >
                              <FaCheck className="mt-1 h-4 w-4 flex-shrink-0" style={{ color: '#767014' }} />
                              <span style={{ color: '#000000', opacity: 0.8 }}>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Additional Features for Tea Library */}
                      {service.additionalFeatures && (
                        <div className="mb-6">
                          <p className="font-semibold mb-2" style={{ color: '#767014' }}>You can also:</p>
                          <ul className="space-y-2">
                            {service.additionalFeatures.map((feature, featureIndex) => (
                              <li
                                key={featureIndex}
                                className="flex items-start gap-3"
                              >
                                <FaCheck className="mt-1 h-4 w-4 flex-shrink-0" style={{ color: '#767014' }} />
                                <span style={{ color: '#000000', opacity: 0.8 }}>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Extra Info */}
                      {service.extraInfo && (
                        <p className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#C5BF81', color: '#000000', opacity: 0.9 }}>
                          {service.extraInfo}
                        </p>
                      )}

                      {/* Perfect For Section */}
                      {service.perfectFor && (
                        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)', borderLeft: '4px solid #767014' }}>
                          <p className="font-semibold mb-2" style={{ color: '#767014' }}>This session is perfect for:</p>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {service.perfectFor.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-center gap-2">
                                <FaCheck className="h-3 w-3" style={{ color: '#767014' }} />
                                <span style={{ color: '#000000', opacity: 0.8 }}>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {service.perfectForText && (
                        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)', borderLeft: '4px solid #767014' }}>
                          <p className="font-semibold mb-1" style={{ color: '#767014' }}>Perfect For:</p>
                          <p style={{ color: '#000000', opacity: 0.8 }}>{service.perfectForText}</p>
                        </div>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap gap-4 pt-4" style={{ borderTop: '1px solid #C5BF81' }}>
                        {service.duration && (
                          <div className="flex items-center gap-2">
                            <FaClock className="h-4 w-4" style={{ color: '#767014' }} />
                            <span className="text-sm" style={{ color: '#000000', opacity: 0.8 }}>
                              <strong>Duration:</strong> {service.duration}
                            </span>
                          </div>
                        )}
                        {service.output && (
                          <div className="flex items-center gap-2">
                            <FaLeaf className="h-4 w-4" style={{ color: '#767014' }} />
                            <span className="text-sm" style={{ color: '#000000', opacity: 0.8 }}>
                              <strong>Output:</strong> {service.output}
                            </span>
                          </div>
                        )}
                        {service.revenueModel && (
                          <div className="flex items-center gap-2">
                            <FaMoneyBillWave className="h-4 w-4" style={{ color: '#767014' }} />
                            <span className="text-sm" style={{ color: '#000000', opacity: 0.8 }}>
                              <strong>Revenue Model:</strong> {service.revenueModel}
                            </span>
                          </div>
                        )}
                        {service.experienceType && (
                          <div className="flex items-center gap-2">
                            <FaUsers className="h-4 w-4" style={{ color: '#767014' }} />
                            <span className="text-sm" style={{ color: '#000000', opacity: 0.8 }}>
                              <strong>Experience Type:</strong> {service.experienceType}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Additional Info */}
        <section className="py-16" style={{ background: 'linear-gradient(135deg, #C5BF81 0%, #ffffff 50%, #C5BF81 100%)' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-serif font-bold mb-6" style={{ color: '#767014' }}>
                Customize Your Experience
              </h2>
              <p className="text-lg mb-8" style={{ color: '#000000', opacity: 0.85 }}>
                Want to combine multiple experiences? Our booking system allows
                you to select multiple programs and create your perfect tea day.
                Group discounts available for parties of 5 or more.
              </p>
              <Button 
                asChild 
                size="lg"
                className="font-bold rounded-full px-8 py-6"
                style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)', color: '#ffffff' }}
              >
                <Link href="/book">Create Your Custom Experience</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
