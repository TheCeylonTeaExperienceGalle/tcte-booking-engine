"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Card, CardContent } from "@/components/ui/card";
import { FaShieldAlt, FaUserShield, FaLock, FaDatabase, FaCookie, FaShareAlt, FaEdit, FaEnvelope } from "react-icons/fa";

export default function PrivacyPolicy() {
  const [isLoading, setIsLoading] = useState(true);

  const sections = [
    {
      icon: FaDatabase,
      title: "Information We Collect",
      content: [
        "Personal identification information (such as your name, email address, and phone number) provided voluntarily by you during the registration or booking process.",
        "Payment and billing information necessary to process your bookings, including credit card details, which are securely handled by trusted third-party payment processors.",
        "Booking details including preferred dates, number of guests, and special requirements.",
        "Browsing information, such as your IP address, browser type, and device information, collected automatically using cookies and similar technologies.",
      ],
    },
    {
      icon: FaUserShield,
      title: "Use of Information",
      content: [
        "To process and manage your bookings and reservations.",
        "To communicate with you regarding your bookings, provide customer support, and respond to inquiries or requests.",
        "To personalize your experience and present relevant recommendations and promotions.",
        "To improve our website, experiences, and services based on your feedback and browsing patterns.",
        "To detect and prevent fraud, unauthorized activities, and abuse of our website.",
      ],
    },
    {
      icon: FaShareAlt,
      title: "Information Sharing",
      content: [
        "Trusted service providers: We may share your information with third-party service providers who assist us in operating our website, processing payments, and managing bookings. These providers are contractually obligated to handle your data securely and confidentially.",
        "Legal requirements: We may disclose your information if required to do so by law or in response to valid legal requests or orders.",
        "We respect your privacy and do not sell, trade, or otherwise transfer your personal information to third parties without your consent.",
      ],
    },
    {
      icon: FaLock,
      title: "Data Security",
      content: [
        "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.",
        "Please be aware that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.",
      ],
    },
    {
      icon: FaCookie,
      title: "Cookies and Tracking Technologies",
      content: [
        "We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and gather information about your preferences and interactions with our website.",
        "You have the option to disable cookies through your browser settings, but this may limit certain features and functionality of our website.",
      ],
    },
    {
      icon: FaEdit,
      title: "Changes to the Privacy Policy",
      content: [
        "We reserve the right to update or modify this Privacy Policy at any time.",
        "Any changes will be posted on this page with a revised \"last updated\" date.",
        "We encourage you to review this Privacy Policy periodically to stay informed about how we collect, use, and protect your information.",
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
              <FaShieldAlt className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Privacy Policy
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              Your privacy is important to us. Learn how we collect, use, and protect your information.
            </p>
          </div>
        </section>

        {/* Introduction */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    We are committed to protecting the privacy and security of our customers&apos; personal information. This Privacy Policy outlines how we collect, use, and safeguard your information when you visit our website or make a booking for our tea experiences. By using our website, you consent to the practices described in this policy.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Policy Sections */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {sections.map((section, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-primary to-primary/70 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <section.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-4">{section.title}</h3>
                        <ul className="space-y-2">
                          {section.content.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-2 text-muted-foreground">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-gradient-to-br from-primary to-primary/70 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0">
                      <FaEnvelope className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
                      <p className="text-muted-foreground mb-4">
                        If you have any questions, concerns, or requests regarding our Privacy Policy or the handling of your personal information, please contact us using the information provided below.
                      </p>
                      <p className="text-muted-foreground">
                        Email: <a href="mailto:reservations@theceylonteaexperience.com" className="text-primary hover:underline">info@ceylonteaexperience.com</a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
