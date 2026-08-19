"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Card, CardContent } from "@/components/ui/card";
import { FaFileContract, FaGlobe, FaBoxOpen, FaShoppingCart, FaTruck, FaUndo, FaCopyright, FaExclamationTriangle, FaEdit, FaEnvelope } from "react-icons/fa";

export default function TermsAndConditions() {
  const [isLoading, setIsLoading] = useState(true);

  const sections = [
    {
      icon: FaGlobe,
      title: "Use of the Website",
      content: [
        "You must be at least 18 years old to use our website or make bookings. Children must be accompanied by adults during all experiences.",
        "You are responsible for maintaining the confidentiality of your account information, including your username and password.",
        "You agree to provide accurate and current information during the registration and booking process.",
        "You may not use our website for any unlawful or unauthorized purposes.",
      ],
    },
    {
      icon: FaBoxOpen,
      title: "Experience Information and Pricing",
      content: [
        "We strive to provide accurate experience descriptions, images, and pricing information. However, we do not guarantee the accuracy or completeness of such information.",
        "Prices are subject to change without notice. Any promotions or discounts are valid for a limited time and may be subject to additional terms and conditions.",
        "Experience availability may vary based on seasons, weather conditions, and other factors.",
      ],
    },
    {
      icon: FaShoppingCart,
      title: "Bookings and Payments",
      content: [
        "By placing a booking on our website, you are making an offer to reserve the selected experience.",
        "All bookings are subject to availability and confirmation. A booking is only confirmed once you receive a confirmation email from us.",
        "We reserve the right to refuse or cancel any booking for any reason, including but not limited to availability, errors in pricing, or suspected fraudulent activity.",
        "You agree to provide valid and up-to-date payment information and authorize us to charge the booking amount, including applicable taxes, to your chosen payment method.",
        "We use trusted third-party payment processors to handle your payment information securely. We do not store or have access to your full payment details.",
      ],
    },
    {
      icon: FaTruck,
      title: "Experience Guidelines",
      content: [
        "Please arrive at least 15 minutes before your scheduled experience time.",
        "We recommend wearing comfortable clothing and appropriate footwear for the tea experience.",
        "Any food allergies, dietary restrictions, or medical conditions should be disclosed at the time of booking.",
        "Photography is permitted for personal use during experiences unless otherwise specified.",
      ],
    },
    {
      icon: FaUndo,
      title: "Cancellations and Refunds",
      content: [
        "Our Refund Policy governs the process and conditions for cancelling bookings and seeking refunds.",
        "Cancellation requests must be submitted via email at least 7 days prior to the booked date.",
        "No-shows will not be eligible for refunds or rescheduling.",
        "Please refer to our Refund Policy page for more information.",
      ],
    },
    {
      icon: FaCopyright,
      title: "Intellectual Property",
      content: [
        "All content and materials on our website, including but not limited to text, images, logos, and graphics, are protected by intellectual property rights and are the property of The Ceylon Tea Experience or its licensors.",
        "You may not use, reproduce, distribute, or modify any content from our website without our prior written consent.",
      ],
    },
    {
      icon: FaExclamationTriangle,
      title: "Limitation of Liability",
      content: [
        "In no event shall The Ceylon Tea Experience, its directors, employees, or affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with your use of our website or participation in our experiences.",
        "Visitors participate in all activities at their own risk. We are not liable for any injuries, accidents, or loss of personal belongings during your visit.",
        "We are not responsible for delays or cancellations due to weather conditions or other factors beyond our control.",
      ],
    },
    {
      icon: FaEdit,
      title: "Amendments and Termination",
      content: [
        "We reserve the right to modify, update, or terminate these Terms and Conditions at any time without prior notice.",
        "It is your responsibility to review these terms periodically for any changes.",
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
              <FaFileContract className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Terms & Conditions
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              Please read these terms carefully before using our services.
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
                    These Terms and Conditions govern your use of our website and the booking of tea experiences from our platform. By accessing and using our website, you agree to comply with these terms. Please read them carefully before proceeding with any bookings.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Terms Sections */}
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

        {/* Related Policies */}
        <section className="py-12 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-2xl font-serif font-bold mb-4">Related Policies</h2>
              <p className="text-muted-foreground mb-6">
                Please also review our other policies which form part of these terms:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/privacy-policy" className="text-primary hover:underline font-medium">
                  Privacy Policy
                </Link>
                <span className="text-muted-foreground">•</span>
                <Link href="/refund-policy" className="text-primary hover:underline font-medium">
                  Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-12">
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
                        If you have any questions about these Terms and Conditions, please contact us.
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
