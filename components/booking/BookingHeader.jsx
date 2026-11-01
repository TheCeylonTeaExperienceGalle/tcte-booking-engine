"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const links = [
  { label: "Home", href: "https://www.theceylonteaexperience.com/" },
  { label: "About", href: "https://www.theceylonteaexperience.com/#about" },
  { label: "Services", href: "https://www.theceylonteaexperience.com/#services" },
  { label: "Gallery", href: "https://www.theceylonteaexperience.com/#gallery" },
  { label: "Journal", href: "https://www.theceylonteaexperience.com/blog", normalCase: true },
  { label: "Contact", href: "https://www.theceylonteaexperience.com/#contact" },
];

export default function BookingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 bg-[#1A3D1A] px-4 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50">
        <nav
          aria-label="Primary navigation"
          className="relative flex items-center justify-between border-b border-gray-200 bg-[#F9F6F0] px-4 py-4 lg:px-8"
        >
          <a
            href="https://www.theceylonteaexperience.com/"
            className="flex cursor-pointer items-center text-2xl font-serif font-bold text-[#2D6A2D]"
            aria-label="Go to The Ceylon Tea Experience home page"
          >
            <img
              src="/logo.webp"
              alt="The Ceylon Tea Experience"
              width="256"
              height="256"
              className="-my-16 h-44 w-auto object-contain"
            />
          </a>

          <ul className="hidden gap-4 text-xs font-sans font-bold uppercase tracking-wider text-gray-600 md:flex lg:gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className={`cursor-pointer transition hover:text-[#2D6A2D] ${
                    link.normalCase ? "normal-case" : ""
                  }`}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/book"
              className="cursor-pointer rounded-sm bg-[#2D6A2D] px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#1A3D1A] lg:px-6"
            >
              Book Now
            </Link>
          </div>

          <button
            type="button"
            className="text-2xl text-[#1A3D1A] md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? "✕" : "☰"}
          </button>

          {menuOpen && (
            <div
              id="mobile-navigation"
              className="absolute left-0 right-0 top-full z-50 border-b border-gray-200 bg-[#F9F6F0] shadow-lg md:hidden"
            >
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block w-full cursor-pointer border-b border-gray-100 px-8 py-4 text-left text-xs font-sans font-bold tracking-wider text-gray-600 hover:bg-gray-50 hover:text-[#2D6A2D] ${
                    link.normalCase ? "normal-case" : "uppercase"
                  }`}
                >
                  {link.label}
                </a>
              ))}
              <div className="px-8 py-6">
                <Link
                  href="/book"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full rounded-sm bg-[#2D6A2D] py-3 text-center text-xs font-bold uppercase tracking-wider text-white shadow-md"
                >
                  Book Now
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
