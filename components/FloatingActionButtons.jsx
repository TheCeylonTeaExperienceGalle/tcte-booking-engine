"use client";

import { useState, useEffect } from "react";
import { FaWhatsapp, FaPhone, FaEnvelope, FaChevronUp } from "react-icons/fa";
import { Button } from "@/components/ui/button";

export default function FloatingActionButtons() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
        setIsExpanded(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const contactOptions = [
    {
      icon: FaWhatsapp,
      label: "WhatsApp",
      href: "https://wa.me/+94 702900500",
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      icon: FaPhone,
      label: "Call Us",
      href: "tel:+94 702900500",
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      icon: FaEnvelope,
      label: "Email",
      href: "mailto:reservations@theceylonteaexperience.com",
      color: "bg-purple-500 hover:bg-purple-600",
    },
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Contact Options */}
      <div
        className={`flex flex-col gap-3 mb-4 transition-all duration-300 ${
          isExpanded
            ? "opacity-100 transform translate-y-0"
            : "opacity-0 transform translate-y-4 pointer-events-none"
        }`}
      >
        {contactOptions.map((option, index) => (
          <a
            key={option.label}
            href={option.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${option.color} text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 magnetic bounce-in glowing-border`}
            style={{ animationDelay: `${index * 0.1}s` }}
            title={option.label}
          >
            <option.icon className="w-5 h-5" />
          </a>
        ))}
      </div>

      {/* Main FAB */}
      <div className="flex flex-col gap-2">
        {/* Contact Toggle */}
        <Button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 bg-primary hover:bg-primary/90 magnetic pulse-glow elastic ${
            isExpanded ? "rotate-45" : ""
          }`}
          title="Contact Options"
        >
          <span className="text-2xl">💬</span>
        </Button>

        {/* Scroll to Top */}
        <Button
          onClick={scrollToTop}
          className="w-14 h-14 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 magnetic animate-bounce-in liquid-btn"
          title="Back to Top"
        >
          <FaChevronUp className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}