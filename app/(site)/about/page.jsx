"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Card, CardContent } from "@/components/ui/card";
import { FaMapMarkerAlt, FaHeart, FaLeaf, FaEye, FaBullseye } from "react-icons/fa";

export default function About() {
  const [isLoading, setIsLoading] = useState(true);
  const team = [
    {
      name: "Rajesh Kumar",
      role: "Tea Master",
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
    },
    {
      name: "Priya Sharma",
      role: "Tour Coordinator",
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
    },
    {
      name: "Arjun Patel",
      role: "Tea Sommelier",
      image:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
    },
    {
      name: "Meera Reddy",
      role: "Heritage Guide",
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80",
    },
  ];

  const values = [
    {
      icon: FaLeaf,
      //title: "Sustainability",
      description:
        "To redefine tea tourism through immersive, hands-on experiences",
    },
    {
      icon: FaHeart,
      //title: "Authenticity",
      description:
        "To showcase the regional diversity of Sri Lankan tea in one accessible destination",
    },
    {
      icon: FaMapMarkerAlt,
      //title: "Local Heritage",
      description:
        "To showcase the regional diversity of Sri Lankan tea in one accessible destination",
    },
    {
      icon: FaMapMarkerAlt,
      //title: "Local Heritage",
      description:
        "To elevate the global perception of Ceylon Tea through storytelling and premium hospitality",
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
              <FaLeaf className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              About The Ceylon Tea Experience (TCTE)
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
             {/* <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              About The Ceylon Tea Experience (TCTE)
            </p> */}
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <div className="prose prose-lg max-w-none">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  The Ceylon Tea Experience (TCTE) is a flagship experiential cafe concept designed to showcase the heritage, craftsmanship, and diversity of Sri Lanka’s tea culture.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  Located in Galle - one of the country’s most visited tourist cities - TCTE brings together interactive learning, artisanal tea-making, and modern cafe hospitality in one beautifully curated space.
                </p>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Our purpose is simple:<br />
                  <span className="font-bold">To give every traveler the chance to truly experience Ceylon Tea - not just taste it.</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Vision & Mission Section */}
        <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #C5BF81 0%, #ffffff 50%, #C5BF81 100%)' }}>
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #767014, transparent)' }}></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #767014, transparent)' }}></div>

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-4xl mx-auto space-y-12">
              {/* Vision Card */}
              <div className="group">
                <div className="rounded-2xl p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 relative overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                  {/* Decorative corner */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
                        <FaEye className="h-12 w-12" style={{ color: '#ffffff' }} />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-6 text-center" style={{ color: '#767014' }}>
                      Our Vision
                    </h2>
                    
                    <div className="h-1 w-20 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)' }}></div>
                    
                    <p className="text-base sm:text-lg leading-relaxed text-center" style={{ color: '#000000', opacity: 0.85 }}>
                      To become Sri Lanka&apos;s most iconic tea experience brand - connecting global travelers to the story, soul, and flavours of Ceylon Tea.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mission Card */}
              <div className="group">
                <div className="rounded-2xl p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all duration-300 border-2 relative overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                  {/* Decorative corner */}
                  <div className="absolute top-0 left-0 w-32 h-32 opacity-10" style={{ background: 'linear-gradient(135deg, #C5BF81, #767014)' }}></div>
                  
                  <div className="relative">
                    <div className="flex items-center justify-center mb-6">
                      <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300" style={{ background: 'linear-gradient(135deg, #C5BF81, #767014)' }}>
                        <FaBullseye className="h-12 w-12" style={{ color: '#ffffff' }} />
                      </div>
                    </div>
                    
                    <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-6 text-center" style={{ color: '#767014' }}>
                      Our Mission
                    </h2>
                    
                    <div className="h-1 w-20 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, #C5BF81, #767014)' }}></div>
                    
                    <ul className="space-y-6 max-w-2xl mx-auto">
                      {values.map((value, index) => (
                        <li key={index} className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
                            <value.icon className="h-5 w-5" style={{ color: '#ffffff' }} />
                          </div>
                          <p className="text-base sm:text-lg leading-relaxed flex-1 pt-1" style={{ color: '#000000', opacity: 0.85 }}>
                            {value.description}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Location Section */}
        <section className="py-20" style={{ background: 'linear-gradient(180deg, #f8f7f2 0%, #ffffff 100%)' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4" style={{ color: '#767014' }}>
                Our Location
              </h2>
              <div className="h-1 w-24 mx-auto mb-8 rounded-full" style={{ background: 'linear-gradient(to right, #767014, #C5BF81)' }}></div>
              <p className="text-lg sm:text-xl mb-10" style={{ color: '#000000', opacity: 0.8 }}>
                Conveniently located within the city limits, easily accessible from Galle Fort, the Southern Highway, Unawatuna, and all major tourist resorts along the coast.
              </p>
              <div className="rounded-2xl p-8 shadow-lg border-2 inline-block transition-all duration-300 hover:shadow-xl hover:scale-105" style={{ backgroundColor: '#ffffff', borderColor: '#C5BF81' }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md" style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)' }}>
                  <FaMapMarkerAlt className="h-8 w-8" style={{ color: '#ffffff' }} />
                </div>
                <p className="font-bold text-xl" style={{ color: '#767014' }}>Galle, Southern Sri Lanka</p>
                <p className="text-sm mt-2" style={{ color: '#C5BF81' }}>Heart of the Southern Coast</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #767014 0%, #C5BF81 50%, #767014 100%)' }}>
          <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4" style={{ color: '#ffffff' }}>
                Who We Are
              </h2>
              <div className="h-1 w-24 mx-auto mb-8 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
              <div className="max-w-3xl mx-auto rounded-2xl p-8 shadow-xl" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
                <p className="text-lg sm:text-xl mb-6" style={{ color: '#000000', opacity: 0.8 }}>
                  A team of tea experts, storytellers, artisans, and hospitality professionals dedicated to 
                  preserving and celebrating Sri Lanka&apos;s tea legacy.
                </p>
                <div className="pt-6 border-t-2" style={{ borderColor: '#C5BF81' }}>
                  <p className="text-lg" style={{ color: '#767014' }}>The brand operates on one philosophy:</p>
                  <p className="text-xl sm:text-2xl font-bold mt-2" style={{ color: '#000000' }}>
                    &quot;Don&apos;t just drink Ceylon Tea — experience it.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {team.map((member, index) => (
                <div key={index} className="text-center group">
                  <div className="relative w-48 h-48 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/20 group-hover:border-primary transition-all duration-300 group-hover:scale-105 shadow-lg group-hover:shadow-xl">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-110"
                      sizes="(max-width: 640px) 12rem, 12rem"
                      priority={false}
                    />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-primary">
                    {member.name}
                  </h3>
                  <p className="text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div> */}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
