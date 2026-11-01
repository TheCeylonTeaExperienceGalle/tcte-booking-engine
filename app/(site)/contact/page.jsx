"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleEffect from "@/components/ParticleEffect";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaWhatsapp,
  FaClock,
  FaHeadset,
  FaGlobe,
} from "react-icons/fa";

export default function Contact() {
  const [isLoading, setIsLoading] = useState(true);

  const contactInfo = [
    {
      icon: FaMapMarkerAlt,
      title: "Location",
      details: ["146A, Sea Street Galle, Sri Lanka"],
    },
    {
      icon: FaPhone,
      title: "Phone",
      details: ["(+94) 70 290 0500"],
      link: "tel:(+94) 70 290 0500",
    },
    {
      icon: FaEnvelope,
      title: "Email",
      details: ["reservations@theceylonteaexperience.com",],
      links: ["mailto:reservations@theceylonteaexperience.com",],
    },
    {
      icon: FaGlobe,
      title: "Website",
      details: ["www.ceylonteaexperience.com"],
      link: "https://www.ceylonteaexperience.com",
    },
    {
      icon: FaClock,
      title: "Opening Hours",
      details: ["Daily – 9.00 AM to 7.00 PM"],
    },
  ];

  // WhatsApp deep link with pre-filled message
  const whatsappMessage = encodeURIComponent(
    "Hello! I'm interested in booking a tea tour experience at THE CEYLON TEA."
  );
  const whatsappLink = `https://wa.me/0702900500?text=${whatsappMessage}`;

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
              <FaHeadset className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Contact Us
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              For bookings, group visits, collaborations, or general inquiries, reach out to us anytime.
            </p>
          </div>
        </section>

        {/* Contact Info Grid */}
        <section className="py-16">
          <div className="container mx-auto px-10 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                  {contactInfo.map((info, index) => {
                        const isEmailCard = info.title === "Email";
                        const cardClass = 'text-center group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary h-full';

                    const containerSizeClass = 'w-16 h-16';
                    const iconSizeClass = 'h-8 w-8';
                    const titleClass = 'font-bold text-lg mb-3 text-primary';
                        const detailLineClass = isEmailCard
                          ? 'block text-center whitespace-normal break-words leading-relaxed max-w-[260px] mx-auto'
                          : undefined;

                    return (
                      <Card key={index} className={cardClass}>
                        <CardContent className="pt-6">
                          <div className={`bg-gradient-to-br from-primary to-primary/70 ${containerSizeClass} rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <info.icon className={`${iconSizeClass} text-white`} />
                          </div>
                          <h3 className={titleClass}>
                            {info.title}
                          </h3>
                          <div className="text-muted-foreground space-y-1">
                            {info.details.map((detail, idx) => (
                              <p key={idx} className={detailLineClass}>
                                {info.links && info.links[idx] ? (
                                  <a
                                    href={info.links[idx]}
                                    className="hover:text-primary transition-colors font-medium"
                                  >
                                    {detail}
                                  </a>
                                ) : info.link && idx === 0 ? (
                                  <a
                                    href={info.link}
                                    className="hover:text-primary transition-colors font-medium"
                                  >
                                    {detail}
                                  </a>
                                ) : (
                                  detail
                                )}
                              </p>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
            </div>

            {/* WhatsApp CTA */}
            <div className="text-center mb-12">
              <Button
                asChild
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <FaWhatsapp className="h-5 w-5" />
                  Chat with us on WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-16 bg-secondary/20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-serif font-bold mb-4 text-primary">
                Find Us Here
              </h2>
              <p className="text-muted-foreground">
                Located in the heart of the tea country
              </p>
            </div>

            {/* Embedded Google Map */}
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video w-full rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3590.5526402215646!2d80.2246648!3d6.037233199999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae1736b35262d13%3A0x993881923260c1bd!2sThe%20Ceylon%20Tea%20Experience%20-%20Galle!5e1!3m2!1sen!2slk!4v1767592375175!5m2!1sen!2slk"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="THE CEYLON TEA Location"
                ></iframe>
              </div>
              <div className="mt-6 text-center">
                <Button asChild variant="outline">
                  <a
                    href="https://maps.google.com/?q=Tea+Estate+Road+Hill+Country"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links */}
        <section className="py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-serif font-bold mb-8 text-primary">
              Ready to Experience Tea Tourism?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/book">Book Your Experience</Link>
              </Button>
              {/* <Button asChild size="lg" variant="outline">
                <Link href="/services">View Our Programs</Link>
              </Button> */}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
