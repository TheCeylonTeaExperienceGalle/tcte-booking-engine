"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/gallery", label: "Gallery" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        isScrolled
          ? "bg-background/95 backdrop-blur-md shadow-xl border-b border-primary/20"
          : "bg-background/80 backdrop-blur-sm"
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Enhanced Logo */}
          <Link href="/" className="flex items-center space-x-3 group animate-fade-in-up hover-glow">
            <Image
              src="/image/logo/logo.png"
              alt="Reviva logo"
              width={200}
              height={200}
              className=" object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 filter brightness-0"
              priority
              quality={70}
            />
            
          </Link>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 animate-fade-in-up stagger-children" style={{animationDelay: "0.2s"}}>
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-sm font-medium text-foreground hover:text-primary transition-all duration-300 hover:scale-105 hover-glow group"
                style={{animationDelay: `${0.1 + index * 0.05}s`}}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </nav>

          {/* Enhanced CTA Button */}
          <div className="hidden md:block animate-fade-in-up" style={{animationDelay: "0.4s"}}>
            <Button asChild className="animate-pulse-glow hover-lift transition-all duration-300 hover:scale-105">
              <Link href="/book">Book Now</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="w-full">
                <Link href="/book" onClick={() => setIsMobileMenuOpen(false)}>
                  Book Now
                </Link>
              </Button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
