"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LoadingScreen from "@/components/LoadingScreen";
import FloatingActionButtons from "@/components/FloatingActionButtons";
import { Card, CardContent } from "@/components/ui/card";
import { FaUndo, FaClock, FaCalendarAlt, FaEnvelope } from "react-icons/fa";

export default function RefundPolicy() {
  const [isLoading, setIsLoading] = useState(true);

  const policies = [
    {
      icon: FaUndo,
      title: "Refunds",
      content: [
        "Requests have to be sent by email to reservations@theceylonteaexperience.com",
        "Refunds will be only made for requests made 7 days prior to the booked date",
        "If your request is approved, we will initiate a refund to your original method of payment",
        "Please note that the refund amount will exclude any taxes and charges incurred during the initial purchase",
      ],
    },
    {
      icon: FaCalendarAlt,
      title: "Change of Dates",
      content: [
        "Changing of dates can be only done 7 days prior to the booked date",
        "All date changes are subject to availability",
      ],
    },
    {
      icon: FaClock,
      title: "Processing Time",
      content: [
        "Refunds will be processed within 3 business days after we receive your request",
        "Booking reference should be clearly mentioned in your request",
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
              <FaUndo className="h-16 w-16 mx-auto mb-4 animate-pulse" style={{ color: '#ffffff' }} />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-6 drop-shadow-2xl" style={{ color: '#ffffff' }}>
              Refund Policy
            </h1>
            <div className="h-1 w-32 mx-auto mb-6 rounded-full" style={{ background: 'linear-gradient(to right, transparent, #ffffff, transparent)' }}></div>
            <p className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto drop-shadow-lg font-light" style={{ color: '#ffffff', opacity: 0.95 }}>
              Understanding our cancellation and refund policies for a worry-free booking experience.
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
                    Thank you for booking at theceylonteaexperience.com. We value your satisfaction and strive to provide you with the best tea experience possible. If, for any reason, you are not completely satisfied with your purchase, we are here to help.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Policy Details */}
        <section className="py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">
              {policies.map((policy, index) => (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 border-2 hover:border-primary">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-gradient-to-br from-primary to-primary/70 w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <policy.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-4">{policy.title}</h3>
                        <ul className="space-y-2">
                          {policy.content.map((item, itemIndex) => (
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
                        If you have any questions or concerns regarding our refund policy, please contact our customer support team. We are here to assist you and ensure your booking experience with us is enjoyable and hassle-free.
                      </p>
                      <p className="text-muted-foreground">
                        Email: <a href="mailto:reservations@theceylonteaexperience.com" className="text-primary hover:underline">reservations@theceylonteaexperience.com</a>
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
